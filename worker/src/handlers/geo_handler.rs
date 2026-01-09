use async_nats::Client;
use futures::StreamExt;
use crate::types::{GeoProcessRequest, GeoProcessResponse, GeoProcessError};
use crate::engine::geo::process_vfr;

const SUBJECT: &str = "popula.geo.process_vfr";

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
                Ok(response) => {
                    let response_json = serde_json::to_vec(&response).unwrap_or_default();
                    if let Err(e) = client.publish(reply_subject, response_json.into()).await {
                        tracing::error!("Failed to send response: {}", e);
                    }
                }
                Err(error_msg) => {
                    let error = GeoProcessError {
                        error: error_msg.clone(),
                        details: None::<String>,
                    };
                    let error_json = serde_json::to_vec(&error).unwrap_or_default();
                    if let Err(e) = client.publish(reply_subject, error_json.into()).await {
                        tracing::error!("Failed to send error response: {}", e);
                    }
                    tracing::error!("Geo processing error: {}", error_msg);
                }
            }
        });
    }
}

async fn handle_request(payload: &[u8]) -> Result<GeoProcessResponse, String> {
    // Parse request
    let request: GeoProcessRequest = serde_json::from_slice(payload)
        .map_err(|e| format!("Failed to parse request: {}", e))?;
    
    tracing::info!("Processing VFR XML: {} bytes, target CRS: {}", 
        request.xml_content.len(), request.options.target_crs);
    
    // Process VFR (this is the CPU-intensive part)
    let response = process_vfr(request).await?;
    
    tracing::info!("Processed {} features in {}ms", 
        response.metadata.feature_count, response.metadata.processing_time_ms);
    
    Ok(response)
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
