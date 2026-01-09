mod vfr_parser;
mod area_calc;

pub use vfr_parser::parse_vfr_xml;
pub use area_calc::compute_feature_areas_s_jtsk;

use crate::types::{GeoProcessRequest, GeoProcessResponse, GeoMetadata};
use std::time::Instant;
use std::convert::TryFrom;

/// Process VFR XML file: parse, deduplicate, compute areas in source CRS
/// Note: Reprojection is handled client-side to avoid PROJ dependency
pub async fn process_vfr(request: GeoProcessRequest) -> Result<GeoProcessResponse, String> {
    let start = Instant::now();
    
    tracing::info!("Starting VFR processing: {} bytes", request.xml_content.len());
    
    // Step 1: Parse VFR XML to GeoJSON (in S-JTSK/Krovak coordinates)
    let mut feature_collection = parse_vfr_xml(&request.xml_content)
        .map_err(|e| format!("XML parsing failed: {}", e))?;
    
    let original_count = feature_collection.features.len();
    tracing::info!("Parsed {} features from XML", original_count);
    
    // Step 2: Deduplicate if requested
    let duplicates_removed = if let Some(prop) = &request.options.deduplicate_by_property {
        let before = feature_collection.features.len();
        feature_collection = deduplicate_features(feature_collection, prop);
        let removed = before - feature_collection.features.len();
        tracing::info!("Removed {} duplicate features", removed);
        Some(removed)
    } else {
        None
    };
    
    // Step 3: Compute areas in source projection (meters)
    // Areas are computed in the projected CRS for accuracy
    if request.options.compute_areas.unwrap_or(true) {
        compute_feature_areas_s_jtsk(&mut feature_collection)
            .map_err(|e| format!("Area calculation failed: {}", e))?;
        tracing::info!("Computed areas for all features");
    }
    
    // Step 4: Calculate bounding box in source CRS
    let bbox = calculate_bbox(&feature_collection);
    
    let processing_time_ms = start.elapsed().as_millis() as u64;
    
    let source_crs = "EPSG:5514"; // S-JTSK / Krovak for Czech data
    let feature_count = feature_collection.features.len();
    
    Ok(GeoProcessResponse {
        geojson: feature_collection,
        metadata: GeoMetadata {
            feature_count,
            bbox,
            processing_time_ms,
            source_crs: source_crs.to_string(),
            target_crs: request.options.target_crs.clone(),
            duplicates_removed,
        },
    })
}

fn deduplicate_features(
    mut fc: geojson::FeatureCollection,
    property: &str,
) -> geojson::FeatureCollection {
    use std::collections::HashSet;
    
    let mut seen = HashSet::new();
    fc.features.retain(|feature| {
        if let Some(props) = &feature.properties {
            if let Some(value) = props.get(property) {
                return seen.insert(value.clone());
            }
        }
        true
    });
    
    fc
}

fn calculate_bbox(fc: &geojson::FeatureCollection) -> [f64; 4] {
    use geo::algorithm::bounding_rect::BoundingRect;
    use geo::Geometry;
    
    let mut west = f64::INFINITY;
    let mut south = f64::INFINITY;
    let mut east = f64::NEG_INFINITY;
    let mut north = f64::NEG_INFINITY;
    
    for feature in &fc.features {
        if let Some(geom) = &feature.geometry {
            if let Ok(geo_geom) = Geometry::try_from(&geom.value) {
                if let Some(rect) = geo_geom.bounding_rect() {
                    west = west.min(rect.min().x);
                    south = south.min(rect.min().y);
                    east = east.max(rect.max().x);
                    north = north.max(rect.max().y);
                }
            }
        }
    }
    
    [west, south, east, north]
}
