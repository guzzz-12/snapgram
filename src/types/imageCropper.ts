export type CropMode = "free" | "aspect";

export type AspectRatioValue = "original" | number;

export interface AspectRatioPreset {
  id: string;
  label: string;
  value: AspectRatioValue;
}

export interface NaturalDimensions {
  width: number;
  height: number;
}

export const ASPECT_RATIO_PRESETS: readonly AspectRatioPreset[] = [
  { id: "original", label: "Original", value: "original" },
  { id: "1-1", label: "1:1", value: 1 },
  { id: "4-5", label: "4:5", value: 4 / 5 },
  { id: "4-3", label: "4:3", value: 4 / 3 },
  { id: "16-9", label: "16:9", value: 16 / 9 },
] as const;