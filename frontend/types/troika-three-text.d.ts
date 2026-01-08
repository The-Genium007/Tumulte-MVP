declare module "troika-three-text" {
  import type { Mesh, Color } from "three";

  export class Text extends Mesh {
    text: string;
    fontSize: number;
    color: string | number | Color;
    anchorX: "left" | "center" | "right" | number;
    anchorY:
      | "top"
      | "top-baseline"
      | "middle"
      | "bottom-baseline"
      | "bottom"
      | number;
    font?: string;
    fontWeight?: string | number;
    fontStyle?: string;
    letterSpacing?: number;
    lineHeight?: number | string;
    maxWidth?: number;
    overflowWrap?: "normal" | "break-word";
    textAlign?: "left" | "right" | "center" | "justify";
    textIndent?: number;
    whiteSpace?: "normal" | "nowrap";
    outlineWidth?: number | string;
    outlineColor?: string | number | Color;
    outlineOpacity?: number;
    outlineBlur?: number | string;
    outlineOffsetX?: number | string;
    outlineOffsetY?: number | string;
    strokeWidth?: number | string;
    strokeColor?: string | number | Color;
    strokeOpacity?: number;
    fillOpacity?: number;
    depthOffset?: number;
    clipRect?: [number, number, number, number] | null;
    orientation?: string;
    glyphGeometryDetail?: number;
    sdfGlyphSize?: number | null;
    gpuAccelerateSDF?: boolean;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
