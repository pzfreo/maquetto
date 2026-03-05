/** 12-color palette for part identification. RGB values in 0–1 range. */
export const PART_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  [0.259, 0.522, 0.957], // Blue
  [0.957, 0.318, 0.216], // Red
  [0.204, 0.659, 0.325], // Green
  [1.0, 0.702, 0.0], // Amber
  [0.612, 0.153, 0.69], // Purple
  [0.0, 0.737, 0.831], // Teal
  [0.957, 0.49, 0.0], // Orange
  [0.345, 0.298, 0.659], // Indigo
  [0.827, 0.184, 0.455], // Pink
  [0.294, 0.686, 0.514], // Mint
  [0.475, 0.333, 0.282], // Brown
  [0.62, 0.62, 0.62], // Grey
];

/** Get a part color by index, wrapping around the palette. */
export function getPartColor(index: number): readonly [number, number, number] {
  return PART_COLORS[index % PART_COLORS.length]!;
}
