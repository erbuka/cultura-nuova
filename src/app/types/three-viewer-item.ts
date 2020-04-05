import { ItemBase, LocalizedText } from './item';

// General

type ThreeViewerItemVector3 = [number, number, number];


interface ThreeViewerItemObject {
    title: LocalizedText,
    description?: LocalizedText,
    position?: ThreeViewerItemVector3,
    rotation?: ThreeViewerItemVector3,
    scale?: ThreeViewerItemVector3,
}

// Models

export interface ThreeViewerItemModel extends ThreeViewerItemObject {
    meshes: {
        name: string,
        file: string
    }[],
    activeMaterial?: number,
    materials: {
        title: LocalizedText,
        description?: LocalizedText,
        meshMaterials: {
            color: number,
            map?: string,
            normalMap?: string
        }[]
    }[]
}


// Lights

export type ThreeViewerItemLightType = "ambient" | "directional";

export interface ThreeViewerItemLight extends ThreeViewerItemObject {
    type: ThreeViewerItemLightType;
    color: number;
}

export interface ThreeViewerItemAmbientLight extends ThreeViewerItemLight {
    type: "ambient";
}

export interface ThreeViewerComponentDirectionalLight extends ThreeViewerItemLight {
    type: "directional";
}



// Base Item

export interface ThreeViewerItem extends ItemBase {
    type: "3d",
    camera: {
        position: ThreeViewerItemVector3,
        lookAt: ThreeViewerItemVector3
    },
    models?: ThreeViewerItemModel[],
    lights?: ThreeViewerItemLight[],
}
