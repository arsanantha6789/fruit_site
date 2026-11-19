export const UNITS = ["kg", "g", "piece", "dozen", "bunch", "pack", "litre"] as const;
export type Unit = (typeof UNITS)[number];

export const UNIT_LABEL: Record<Unit, string> = {
  kg: "kg",
  g: "g",
  piece: "pc",
  dozen: "dozen",
  bunch: "bunch",
  pack: "pack",
  litre: "L",
};
