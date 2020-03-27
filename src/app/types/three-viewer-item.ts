import { ItemBase, LocalizedText } from './item';

type ThreeViewerItemVector3 = [number, number, number];

export type ThreeViewerItemModel = {
    title: LocalizedText,
    description?: LocalizedText,
    position?: ThreeViewerItemVector3,
    rotation?: ThreeViewerItemVector3,
    scale?: ThreeViewerItemVector3,
    meshes?: {
        name: string,
        file: string
    }[];
}

export interface ThreeViewerItem extends ItemBase {
    type: "3d",
    camera: {
        position: ThreeViewerItemVector3,
        lookAt: ThreeViewerItemVector3
    },
    models: ThreeViewerItemModel[]
}
