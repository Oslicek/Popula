use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoProcessOptions {
    #[serde(rename = "targetCrs")]
    pub target_crs: String,
    #[serde(default)]
    pub simplify: Option<bool>,
    #[serde(rename = "simplificationTolerance", default)]
    pub simplification_tolerance: Option<f64>,
    #[serde(rename = "computeAreas", default)]
    pub compute_areas: Option<bool>,
    #[serde(rename = "deduplicateByProperty", default)]
    pub deduplicate_by_property: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoProcessRequest {
    #[serde(rename = "xmlContent")]
    pub xml_content: String,
    pub options: GeoProcessOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoMetadata {
    #[serde(rename = "featureCount")]
    pub feature_count: usize,
    pub bbox: [f64; 4], // [west, south, east, north]
    #[serde(rename = "processingTimeMs")]
    pub processing_time_ms: u64,
    #[serde(rename = "sourceCrs")]
    pub source_crs: String,
    #[serde(rename = "targetCrs")]
    pub target_crs: String,
    #[serde(rename = "duplicatesRemoved", skip_serializing_if = "Option::is_none")]
    pub duplicates_removed: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoProcessResponse {
    pub geojson: geojson::FeatureCollection,
    pub metadata: GeoMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoProcessError {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}
