export type FillStyle = "solid" | "hachure" | "cross-hatch";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";
export type ArrowheadType = "arrow" | "bar" | "dot" | "triangle" | null;
export type Theme = "light" | "dark";

export interface LabelDef {
  text: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;
  strokeColor?: string;
}

export interface BindingTarget {
  id: string;
}

export interface DiagramElement {
  type: string;
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: FillStyle;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  roughness?: number;
  opacity?: number;
  rotation?: number;
  roundness?: { type: number; value?: number } | null;
  label?: LabelDef;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: TextAlign;
  // Arrow/line-specific
  points?: [number, number][];
  start?: BindingTarget;
  end?: BindingTarget;
  startArrowhead?: ArrowheadType;
  endArrowhead?: ArrowheadType;
  // Freedraw-specific
  pressures?: number[];
  simulatePressure?: boolean;
  // Frame-specific
  name?: string;
  // Image-specific
  fileId?: string;
  status?: string;
  // Group
  groupIds?: string[];
}

export interface DiagramMeta {
  title?: string;
  theme?: Theme;
  background?: string;
}

export interface DiagramInput {
  meta?: DiagramMeta;
  elements: DiagramElement[];
}

export interface RenderOptions {
  output: string;
  theme: Theme;
  scale: number;
  padding: number;
  background?: string;
  quiet: boolean;
  verbose: boolean;
}
