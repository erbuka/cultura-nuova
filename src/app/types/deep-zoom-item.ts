import { ItemBase, LocalizedText } from './item';


export interface DeepZoomItemShape {
    type: string;
    title?: LocalizedText;
    href?: string;
    drawAttributes: {
        stroke: boolean;
        fill: boolean;
        strokeColor?: string;
        fillColor?: string;
    }
}


export interface DeepZoomItemPolygon extends DeepZoomItemShape {
    type: "polygon";
    points: [number, number][];
}

export interface DeepZoomItemCircle extends DeepZoomItemShape {
    type: "circle";
    center: [number, number];
    radius: number;
}

export interface DeepZoomItemLayer {
    type: string;
    name: string;
    minZoom?: number;
    maxZoom?: number;
    title?: LocalizedText;
    opacity?: number;
    opacityControl?: boolean;
    visible?: boolean;
    previewImage?: string;
    color?: string;
}

export interface DeepZoomItemDeepImageLayer extends DeepZoomItemLayer {
    type: "deep-image";
    imageFormat: "jpg" | "jpeg" | "png";
    imageSrc: string;
    width: number;
    height: number;
    tileSize: number;
    tileOverlap: number;
}

export interface DeepZoomItemVectorLayer extends DeepZoomItemLayer {
    type: "vector";
    shapes: (DeepZoomItemPolygon | DeepZoomItemCircle)[];
}

export interface DeepZoomItem extends ItemBase {
    type: "deep-zoom";
    options: {
        viewport: {
            dpi: number,
            width: number,
            height: number
        },
        minimapImage: string
    },
    layers: (DeepZoomItemDeepImageLayer | DeepZoomItemVectorLayer)[],
    layerGroups?: {
        name: string;
        exclusive: boolean;
        title?: LocalizedText;
        layers: string[]
    }[]
}

