import { PerspectiveCamera } from "three";

export declare class TouchControls {
    camera: PerspectiveCamera;
    domElement: HTMLElement;
    enabled: boolean;
    rotationSpeed: number;
    zoomSpeed: number;
    wheelZoomStep: number;
    constructor(camera: PerspectiveCamera, domElement: HTMLElement);
    dispose(): void;
}