use geojson::{Feature, FeatureCollection, Geometry, Value as GeoValue};
use quick_xml::events::Event;
use quick_xml::Reader;
use std::collections::HashMap;

/// Parse VFR (Výměnný formát RÚIAN) XML to GeoJSON
/// Expects GML 3.2.1 format with MultiSurface geometries
pub fn parse_vfr_xml(xml_content: &str) -> Result<FeatureCollection, String> {
    let mut reader = Reader::from_str(xml_content);
    reader.config_mut().trim_text(true);
    
    let mut features = Vec::new();
    let mut buf = Vec::new();
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                if e.name().as_ref() == b"gml:MultiSurface" 
                    || e.local_name().as_ref() == b"MultiSurface" {
                    match parse_multi_surface(&mut reader, &e) {
                        Ok(feature) => features.push(feature),
                        Err(e) => tracing::warn!("Failed to parse feature: {}", e),
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML error at position {}: {:?}", reader.error_position(), e)),
            _ => {}
        }
        buf.clear();
    }
    
    if features.is_empty() {
        return Err("No features found in XML".to_string());
    }
    
    Ok(FeatureCollection {
        bbox: None,
        features,
        foreign_members: None,
    })
}

fn parse_multi_surface(
    reader: &mut Reader<&[u8]>,
    _start_element: &quick_xml::events::BytesStart,
) -> Result<Feature, String> {
    let mut polygons = Vec::new();
    let mut properties = HashMap::new();
    let mut buf = Vec::new();
    let mut in_pos_list = false;
    let mut pos_list_content = String::new();
    let mut depth = 1; // Track nesting depth
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                depth += 1;
                let name_bytes = e.name();
                let name = String::from_utf8_lossy(name_bytes.as_ref()).to_string();
                
                if name.ends_with("posList") {
                    in_pos_list = true;
                    pos_list_content.clear();
                } else if name.ends_with("Kod") || name.ends_with("Nazev") {
                    // Extract property values - need separate buf to avoid double borrow
                    let mut text_buf = Vec::new();
                    if let Ok(Event::Text(text)) = reader.read_event_into(&mut text_buf) {
                        let value = text.unescape().unwrap_or_default().to_string();
                        if name.ends_with("Kod") {
                            properties.insert("uzemi_kod".to_string(), serde_json::Value::String(value));
                        } else if name.ends_with("Nazev") {
                            properties.insert("uzemi_txt".to_string(), serde_json::Value::String(value));
                        }
                    }
                }
            }
            Ok(Event::End(e)) => {
                depth -= 1;
                let name_bytes = e.name();
                let name = String::from_utf8_lossy(name_bytes.as_ref()).to_string();
                
                if name.ends_with("posList") {
                    in_pos_list = false;
                    if !pos_list_content.is_empty() {
                        if let Ok(coords) = parse_pos_list(&pos_list_content) {
                            polygons.push(vec![coords]);
                        }
                    }
                } else if (name.ends_with("MultiSurface") || name == "MultiSurface") && depth == 0 {
                    break;
                }
            }
            Ok(Event::Text(e)) => {
                if in_pos_list {
                    pos_list_content.push_str(&e.unescape().unwrap_or_default());
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parse error: {:?}", e)),
            _ => {}
        }
        buf.clear();
    }
    
    if polygons.is_empty() {
        return Err("No polygon coordinates found".to_string());
    }
    
    let geometry = if polygons.len() == 1 {
        Geometry::new(GeoValue::Polygon(polygons.into_iter().next().unwrap()))
    } else {
        Geometry::new(GeoValue::MultiPolygon(polygons))
    };
    
    Ok(Feature {
        bbox: None,
        geometry: Some(geometry),
        id: None,
        properties: if properties.is_empty() { None } else { Some(serde_json::Map::from_iter(properties)) },
        foreign_members: None,
    })
}

fn parse_pos_list(content: &str) -> Result<Vec<Vec<f64>>, String> {
    let numbers: Vec<f64> = content
        .split_whitespace()
        .filter_map(|s| s.parse::<f64>().ok())
        .collect();
    
    if numbers.len() % 2 != 0 {
        return Err("Odd number of coordinates".to_string());
    }
    
    let coords: Vec<Vec<f64>> = numbers
        .chunks(2)
        .map(|chunk| vec![chunk[0], chunk[1]])
        .collect();
    
    if coords.is_empty() {
        return Err("No coordinates parsed".to_string());
    }
    
    Ok(coords)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_pos_list() {
        let input = "-744896.97 -1042363.56 -744890.40 -1042366.96 -744887.78 -1042365.89";
        let result = parse_pos_list(input).unwrap();
        assert_eq!(result.len(), 3);
        assert_eq!(result[0], vec![-744896.97, -1042363.56]);
        assert_eq!(result[1], vec![-744890.40, -1042366.96]);
        assert_eq!(result[2], vec![-744887.78, -1042365.89]);
    }
    
    #[test]
    fn test_parse_simple_vfr() {
        let xml = r#"
        <gml:MultiSurface>
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
        
        let result = parse_vfr_xml(xml);
        assert!(result.is_ok());
        let fc = result.unwrap();
        assert_eq!(fc.features.len(), 1);
    }
}
