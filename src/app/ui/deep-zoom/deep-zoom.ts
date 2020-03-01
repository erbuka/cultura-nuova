
type MeasurableUnit = "inches" | "meters";

export type DeepZoomTools = "pan" | "measure";

export type DeepZoomMeasureUnit = "pixels" | MeasurableUnit;

export interface DeepZoomLayerControls {
    title: string;
    opacity: number;
    visible: boolean;
    exclusive: boolean;
    previewImage: string;
}

const INCHES_CONVERSION_TABLE: { [unit in MeasurableUnit]: number } = {
    inches: 1,
    meters: 0.0254
}

export function measure(lenghtInPixels: number, conversionUnit: MeasurableUnit, dpi: number): number {
    let inches = lenghtInPixels * 1 / dpi;
    return INCHES_CONVERSION_TABLE[conversionUnit] * inches;
}