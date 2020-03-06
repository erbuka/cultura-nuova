
type MeasurableUnit = "inches" | "centimeters";

export type DeepZoomTools = "pan" | "measure";

export type DeepZoomMeasureUnit = "pixels" | MeasurableUnit;

export interface DeepZoomLayerControls {
    title: string;
    opacity: number;
    opacityControl: boolean;
    visible: boolean;
    minZoom: number;
    maxZoom: number;
    previewImage: string;
    color: string;
}

export const DeepZoomLayerControlsDefaults: DeepZoomLayerControls = {
    title: "",
    opacity: 1,
    opacityControl: true,
    visible: true,
    minZoom: -18,
    maxZoom: 0,
    previewImage: "",
    color: "rgba(0,0,0,.25)"
}

const INCHES_CONVERSION_TABLE: { [unit in MeasurableUnit]: number } = {
    inches: 1,
    centimeters: 2.54
}

export function measure(lenghtInPixels: number, conversionUnit: DeepZoomMeasureUnit, dpi: number): number {
    if (conversionUnit === "pixels")
        return lenghtInPixels;

    let inches = lenghtInPixels * 1 / dpi;
    return INCHES_CONVERSION_TABLE[conversionUnit] * inches;
}