import * as L from 'leaflet';

export type LeafletDeepImageLayerOptions = L.GridLayerOptions | {
    cnTileSize: number,
    cnViewportWidth: number,
    cnViewportHeight: number,
    cnWidth: number,
    cnHeight: number,
    cnTileOverlap: number,
    cnImageSrc: string,
}

declare class LeafletDeepImageLayer extends L.GridLayer {
    constructor(options: LeafletDeepImageLayerOptions);
}