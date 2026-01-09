use geojson::{FeatureCollection, Geometry as GeoJsonGeometry, Value as GeoValue};
use geo::{Area, Geometry};
use std::convert::TryFrom;

/// Compute planar area for features in S-JTSK projection (coordinates in meters)
/// and add as property in square kilometers
pub fn compute_feature_areas_s_jtsk(fc: &mut FeatureCollection) -> Result<(), String> {
    for feature in &mut fc.features {
        if let Some(geom) = &feature.geometry {
            if let Ok(area_km2) = calculate_planar_area_km2(geom) {
                // Add area to properties
                if feature.properties.is_none() {
                    feature.properties = Some(serde_json::Map::new());
                }
                
                if let Some(props) = &mut feature.properties {
                    props.insert("areaSqKm".to_string(), serde_json::json!(area_km2));
                }
            }
        }
    }
    
    Ok(())
}

fn calculate_planar_area_km2(geojson_geom: &GeoJsonGeometry) -> Result<f64, String> {
    // Convert GeoJSON geometry to geo-types geometry
    let geo_geom: Geometry<f64> = Geometry::try_from(&geojson_geom.value)
        .map_err(|e| format!("Failed to convert geometry: {}", e))?;
    
    // Calculate planar area (coordinates are in meters for S-JTSK)
    // unsigned_area() uses the shoelace formula for planar polygons
    let area_m2 = match geo_geom {
        Geometry::Polygon(poly) => poly.unsigned_area(),
        Geometry::MultiPolygon(mpoly) => mpoly.unsigned_area(),
        _ => 0.0,
    };
    
    // Convert square meters to square kilometers
    let area_km2 = area_m2 / 1_000_000.0;
    
    Ok(area_km2)
}

#[cfg(test)]
mod tests {
    use super::*;
    use geojson::Feature;
    
    #[test]
    fn test_compute_area_for_simple_polygon() {
        // Create a small polygon in WGS84 coordinates (approx 1km x 1km near equator)
        let mut fc = FeatureCollection {
            bbox: None,
            features: vec![Feature {
                bbox: None,
                geometry: Some(GeoJsonGeometry::new(GeoValue::Polygon(vec![vec![
                    vec![0.0, 0.0],
                    vec![0.01, 0.0],
                    vec![0.01, 0.01],
                    vec![0.0, 0.01],
                    vec![0.0, 0.0],
                ]]))),
                id: None,
                properties: None,
                foreign_members: None,
            }],
            foreign_members: None,
        };
        
        let result = compute_feature_areas(&mut fc);
        assert!(result.is_ok());
        
        // Check that area was added to properties
        let props = fc.features[0].properties.as_ref().unwrap();
        let area = props.get("areaSqKm").unwrap().as_f64().unwrap();
        
        // Area should be roughly 1.2 km² (at equator, 1 degree ≈ 111 km)
        assert!(area > 0.5 && area < 2.0, "Area should be roughly 1 km²");
    }
}
