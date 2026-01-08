export interface RegionProperties {
  LAD23CD?: string;
  LAD23NM?: string;
  LAD23NMW?: string;
  uzemi_kod?: string;
  uzemi_txt?: string;
  BNG_E?: number;
  BNG_N?: number;
  LONG?: number;
  LAT?: number;
  GlobalID?: string;
  areaSqKm?: number | null;
  population?: number | null;
  density?: number | null;
  hasPopulationData?: boolean;
  color?: [number, number, number, number];
  [key: string]: unknown;
}

