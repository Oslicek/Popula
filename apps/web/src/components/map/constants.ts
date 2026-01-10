/**
 * Shared Map Constants
 * 
 * Color scales and visual constants for map rendering
 */

export const REGION_FILL_COLOR: [number, number, number, number] = [255, 64, 128, 160];
export const REGION_LINE_COLOR: [number, number, number, number] = [255, 255, 255, 255];
export const REGION_HOVER_COLOR: [number, number, number, number] = [255, 214, 64, 220];
export const NO_DATA_COLOR: [number, number, number, number] = [180, 180, 180, 120];

// Updated color scale for light theme - Blue gradient
export const DENSITY_COLORS: [number, number, number, number][] = [
  [239, 246, 255, 180], // Lightest - #EFF6FF
  [219, 234, 254, 185], // #DBEAFE
  [191, 219, 254, 190], // #BFDBFE
  [147, 197, 253, 195], // #93C5FD
  [96, 165, 250, 200],  // #60A5FA
  [59, 130, 246, 205],  // #3B82F6
  [37, 99, 235, 210],   // #2563EB
  [29, 78, 216, 215],   // #1D4ED8
  [30, 64, 175, 220],   // #1E40AF
  [30, 58, 138, 225],   // #1E3A8A
];

// Teal-based colors for light theme
export const DENSITY_COLORS_TEAL: [number, number, number, number][] = [
  [240, 253, 250, 180], // Lightest
  [204, 251, 241, 185],
  [153, 246, 228, 190],
  [94, 234, 212, 195],
  [45, 212, 191, 200],
  [20, 184, 166, 205],
  [13, 148, 136, 210],
  [15, 118, 110, 215],
  [17, 94, 89, 220],
  [19, 78, 74, 225],
];
