
type MeasurableUnit = "inches" | "meters";

export type DeepZoomTools = "pan" | "measure";

export type DeepZoomMeasureUnit = "pixels" | MeasurableUnit;

export interface DeepZoomLayerControls {
    title: string;
    opacity: number;
    visible: boolean;
    previewImage: string;
    color: string;
}

export const DeepZoomLayerControlsDefaults: Partial<DeepZoomLayerControls> = {
    opacity: 1,
    visible: true,
    previewImage: "",
    color: "rgba(0,0,0,.25)"
}

const INCHES_CONVERSION_TABLE: { [unit in MeasurableUnit]: number } = {
    inches: 1,
    meters: 0.0254
}

export function measure(lenghtInPixels: number, conversionUnit: MeasurableUnit, dpi: number): number {
    let inches = lenghtInPixels * 1 / dpi;
    return INCHES_CONVERSION_TABLE[conversionUnit] * inches;
}