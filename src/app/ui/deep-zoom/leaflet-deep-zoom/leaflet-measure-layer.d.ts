import * as L from 'leaflet';

export interface LeafletMeasureLayerOptions extends L.LayerOptions {
    measure: (p0: L.LatLng, p1: L.LatLng) => string;
}

export declare class LeafletMeasureLayer extends L.Layer {
    constructor(options: LeafletMeasureLayerOptions);
}