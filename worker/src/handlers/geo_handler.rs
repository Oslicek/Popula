use async_nats::Client;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use crate::types::{GeoProcessRequest, GeoProcessResponse, GeoProcessError};
use crate::engine::geo::process_vfr;

const SUBJECT: &str = "popula.geo.process_vfr";

/// Message envelope that wraps all NATS messages from TypeScript client
#[derive(Debug, Deserialize)]
struct RequestEnvelope {
    #[allow(dead_code)]
    id: String,
    #[allow(dead_code)]
    timestamp: String,
    #[allow(dead_code)]
    #[serde(rename = "correlationId")]
    correlation_id: String,
    payload: GeoProcessRequest,
}

/// Response envelope to match TypeScript expectations
#[derive(Debug, Serialize)]
struct ResponseEnvelope<T> {
    id: String,
    timestamp: String,
    #[serde(rename = "correlationId")]
    correlation_id: String,
    payload: T,
}

impl<T> ResponseEnvelope<T> {
    fn new(payload: T, correlation_id: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            correlation_id,
            payload,
        }
    }
}

pub async fn handle_geo_processing(client: Client) {
    tracing::info!("Starting geo processing handler on subject: {}", SUBJECT);
    
    let mut sub = match client.subscribe(SUBJECT.to_string()).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to subscribe to {}: {}", SUBJECT, e);
            return;
        }
    };
    
    while let Some(message) = sub.next().await {
        let reply_subject = match message.reply {
            Some(ref r) => r.clone(),
            None => {
                tracing::warn!("Received message without reply subject, skipping");
                continue;
            }
        };
        
        // Spawn a task for each request to handle concurrently
        let client = client.clone();
        tokio::spawn(async move {
            match handle_request(&message.payload).await {
                Ok((response, correlation_id)) => {
                    // Wrap response in envelope to match TypeScript expectations
                    let envelope = ResponseEnvelope::new(response, correlation_id);
                    let response_json = serde_json::to_vec(&envelope).unwrap_or_default();
                    if let Err(e) = client.publish(reply_subject, response_json.into()).await {
                        tracing::error!("Failed to send response: {}", e);
                    }
                }
                Err(error_msg) => {
                    let error = GeoProcessError {
                        error: error_msg.clone(),
                        details: None::<String>,
                    };
                    // Also wrap error in envelope
                    let envelope = ResponseEnvelope::new(error, String::new());
                    let error_json = serde_json::to_vec(&envelope).unwrap_or_default();
                    if let Err(e) = client.publish(reply_subject, error_json.into()).await {
                        tracing::error!("Failed to send error response: {}", e);
                    }
                    tracing::error!("Geo processing error: {}", error_msg);
                }
            }
        });
    }
}

async fn handle_request(payload: &[u8]) -> Result<(GeoProcessResponse, String), String> {
    // Parse envelope and extract request
    let envelope: RequestEnvelope = serde_json::from_slice(payload)
        .map_err(|e| format!("Failed to parse request envelope: {}", e))?;
    
    let correlation_id = envelope.correlation_id.clone();
    let request = envelope.payload;
    
    tracing::info!("Processing VFR XML: {} bytes, target CRS: {}", 
        request.xml_content.len(), request.options.target_crs);
    
    // Process VFR (this is the CPU-intensive part)
    let response = process_vfr(request).await?;
    
    tracing::info!("Processed {} features in {}ms", 
        response.metadata.feature_count, response.metadata.processing_time_ms);
    
    Ok((response, correlation_id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::GeoProcessOptions;
    
    #[tokio::test]
    async fn test_handle_simple_vfr() {
        let xml = r#"
        <gml:MultiSurface xmlns:gml="http://www.opengis.net/gml/3.2">
            <gml:surfaceMember>
                <gml:Polygon>
                    <gml:exterior>
                        <gml:LinearRing>
                            <gml:posList>-744896.97 -1042363.56 -744890.40 -1042366.96 -744887.78 -1042365.89 -744896.97 -1042363.56</gml:posList>
                        </gml:LinearRing>
                    </gml:exterior>
                </gml:Polygon>
            </gml:surfaceMember>
        </gml:MultiSurface>
        "#;
        
        let request = GeoProcessRequest {
            xml_content: xml.to_string(),
            options: GeoProcessOptions {
                target_crs: "EPSG:4326".to_string(),
                simplify: None,
                simplification_tolerance: None,
                compute_areas: Some(true),
                deduplicate_by_property: None,
            },
        };
        
        let payload = serde_json::to_vec(&request).unwrap();
        let result = handle_request(&payload).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.metadata.feature_count, 1);
        assert_eq!(response.metadata.source_crs, "EPSG:5514");
        assert_eq!(response.metadata.target_crs, "EPSG:4326");
    }
}
