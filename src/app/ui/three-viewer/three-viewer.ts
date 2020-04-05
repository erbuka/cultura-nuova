import { BufferGeometry, Mesh, Float32BufferAttribute, Group, MeshStandardMaterial, TextureLoader, Texture, DirectionalLight, AmbientLight, Color, Sprite, SpriteMaterial, Camera } from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';
import { ThreeViewerItemModel, ThreeViewerItemLight, ThreeViewerItemLightType } from 'src/app/types/three-viewer-item';
import { LocalizedText } from 'src/app/types/item';
import { ErrorEvent } from 'src/app/context.service';

// Utility functions

enum StaticTextureName {
    LightGizmo
}

let staticTextures: { name: StaticTextureName, filename: string, texture: Texture }[] = [
    { name: StaticTextureName.LightGizmo, filename: "core-assets/three-viewer/light-gizmo.png", texture: null }
];

export const loadPlyMesh: (url: string) => Promise<BufferGeometry> = (url) => {
    return new Promise((resolve, reject) => {
        let loader = new PLYLoader();
        loader.load(url, (geom) => resolve(geom), null, (err) => reject(<ErrorEvent>{ description: JSON.stringify(err) }));
    });
}

export const exportPlyMesh: (mesh: Mesh) => Promise<ArrayBuffer> = (mesh: Mesh) => {
    let plyExporter = new PLYExporter();

    // This is done because PLYExporter applies the world matrix
    // to the mesh before exporing it, and we don't need that since
    // we store position, rotation and scale in the parent group
    let tempMesh = new Mesh(mesh.geometry);

    return new Promise((resolve, reject) => {
        plyExporter.parse(tempMesh, (result: any) => resolve(result as ArrayBuffer), { binary: true })
    });
};

export const loadGeometryFromWavefront: (wfData: ArrayBuffer) => Promise<{ name: string, geometry: BufferGeometry }[]> = async (wfData) => {
    return new Promise((resolve, reject) => {

        let result: { name: string, geometry: BufferGeometry }[] = [];
        let loader = new OBJLoader2();
        let count = 0;

        loader.setUseOAsMesh(true);

        loader.setCallbackOnAssetAvailable((asset) => {

            if (asset.type === "mesh") {
                let geometry = new BufferGeometry();

                if (asset.buffers.vertices)
                    geometry.setAttribute("position", new Float32BufferAttribute(asset.buffers.vertices, 3));

                if (asset.buffers.normals)
                    geometry.setAttribute("normal", new Float32BufferAttribute(asset.buffers.normals, 3));

                if (asset.buffers.uvs)
                    geometry.setAttribute("uv", new Float32BufferAttribute(asset.buffers.uvs, 2));

                let name = asset.params.meshName ? asset.params.meshName : `mesh${count++}`;

                result.push({ name: name, geometry: geometry });

            }

        });

        loader.setCallbackOnError((err) => reject(<ErrorEvent>{ description: JSON.stringify(err) }));

        loader.parse(wfData);

        resolve(result);

    });
}

export const loadTexture: (url: string) => Promise<Texture> = (url) => {
    return new Promise((resolve, reject) => {
        let textureLoader = new TextureLoader();
        textureLoader.load(url, (texture) => resolve(texture), null, (error) => reject(<ErrorEvent>{ description: error.message }));
    });
};

export const loadStaticTextures: () => Promise<void> = async () => {
    for (let s of staticTextures) {
        s.texture = await loadTexture(s.filename);
    }
}

const getStaticTexture: (name: StaticTextureName) => Texture = (name) => {
    return staticTextures.find(x => x.name === name).texture;
}


// Serialization

interface Serializable<T> {
    serialize(binData: BinaryFiles): Promise<T>;
}

export class BinaryFiles {

    files: Map<string, ArrayBuffer> = new Map();

    private nextId: number = 0;

    store(data: ArrayBuffer, ext: string = "bin"): string {
        let name = `./${this.nextId++}.${ext}`
        this.files.set(name, data);
        return name;
    }

}


/**
 * Light
 */
export class ThreeViewerLight extends Group implements Serializable<ThreeViewerItemLight> {

    isThreeViewerLight: boolean = true;

    title: LocalizedText = "";
    description: LocalizedText = "";

    lightType: ThreeViewerItemLightType;

    light: DirectionalLight | AmbientLight;

    gizmo: Sprite;

    constructor(lightType: ThreeViewerItemLightType) {
        super();
        this.lightType = lightType;
        this.initialize();
    }

    get color(): Color {
        return this.light.color;
    }

    updateMatrixWorld(force?: boolean): void {
        super.updateMatrixWorld(force);

    }

    private createGizmo() {

        let gizmo = new Sprite(new SpriteMaterial({
            map: getStaticTexture(StaticTextureName.LightGizmo),
            color: 0xffffff,
            depthTest: false,
            depthWrite: false,
            sizeAttenuation: false
        }));

        gizmo.scale.set(0.1, 0.1, 0.1);
        gizmo.renderOrder = 1;

        this.add(gizmo);
    }


    private initialize(): void {
        switch (this.lightType) {
            case "ambient":
                this.light = new AmbientLight();
                break;
            case "directional":
                this.light = new DirectionalLight();
                break;
            default:
                throw new Error(`Unknown light type: ${this.lightType}`);
        }

        this.createGizmo();

        this.add(this.light);
    }

    async serialize(binData: BinaryFiles): Promise<ThreeViewerItemLight> {
        let pos = this.position;
        let rot = this.rotation;
        let scl = this.scale;
        return {
            title: this.title,
            description: this.description,
            position: [pos.x, pos.y, pos.z],
            rotation: [rot.x, rot.y, rot.z],
            scale: [scl.x, scl.y, scl.z],
            type: this.lightType,
            color: this.color.getHex()
        }
    }

}


/**
 * Model
 */
export class ThreeViewerModel extends Group implements Serializable<ThreeViewerItemModel> {

    isThreeViewerModel: boolean = true;

    title: LocalizedText = "";
    description: LocalizedText = "";

    private _opacity: number = 1;
    private _currentMaterialIndex: number = null;

    private _materials: ThreeViewerModel.Material[] = [];

    set currentMaterial(index: number) {

        index = parseInt(<any>index);

        let mat = this._materials[index];

        if (mat) {
            this._currentMaterialIndex = index;
            this.meshes.forEach((mesh, index) => mesh.material = mat.meshMaterials[index]);
        }
    }

    get currentMaterial(): number {
        return this._currentMaterialIndex;
    }


    set opacity(value: number) {
        this._opacity = value;
        this._materials
            .reduce((prev, curr) => [...prev, ...curr.meshMaterials], <MeshStandardMaterial[]>[])
            .forEach(mat => mat.opacity = value);
    }

    get opacity(): number {
        return this._opacity;
    }

    get meshes(): Mesh[] {
        return <Mesh[]>this.children.filter(x => x instanceof Mesh);
    }

    get materials(): ThreeViewerModel.Material[] {
        return this._materials.map(x => x);
    }

    constructor() {
        super();
    }


    removeMaterial(idx: number) {
        if (this._materials.length <= 1)
            return;

        this._materials.splice(idx, 1);

        this.currentMaterial = 0;

    }

    addMaterial(title: LocalizedText, description: LocalizedText, meshMaterials: MeshStandardMaterial[]): void {

        if (this.meshes.length === 0) {
            throw new Error("There are no meshes");
        }

        if (!(meshMaterials.length === this.meshes.length)) {
            throw new Error(`Wrong number of materials. Expected: ${this.meshes.length}. Found: ${meshMaterials.length}`)
        }

        this._materials.push({
            title: title,
            description: description || "",
            meshMaterials: meshMaterials
        });

        if (this._currentMaterialIndex === null)
            this.currentMaterial = 0;

    }

    async serialize(binFiles: BinaryFiles): Promise<ThreeViewerItemModel> {
        let pos = this.position;
        let scl = this.scale;
        let rot = this.rotation;

        let meshes = this.meshes.map(async mesh => {
            let data = await exportPlyMesh(mesh);
            let fileName = binFiles.store(data, "ply");
            return {
                name: mesh.name,
                file: fileName
            }
        });

        let materials = this._materials.map(async m => {

            let meshMaterials = m.meshMaterials.map(async x => {
                let map = x.map && x.map.image instanceof HTMLImageElement ?
                    binFiles.store(await (await fetch(x.map.image.src)).arrayBuffer()) :
                    undefined;

                let normalMap = x.normalMap && x.normalMap.image instanceof HTMLImageElement ?
                    binFiles.store(await (await fetch(x.normalMap.image.src)).arrayBuffer()) :
                    undefined;

                return {
                    color: x.color.getHex(),
                    map: map,
                    normalMap: normalMap
                }
            });

            return {
                title: m.title,
                description: m.description,
                meshMaterials: await Promise.all(meshMaterials)
            }
        });

        return {
            title: this.title,
            description: this.description,
            position: [pos.x, pos.y, pos.z],
            rotation: [rot.x, rot.y, rot.z],
            scale: [scl.x, scl.y, scl.z],
            activeMaterial: this.currentMaterial,
            meshes: await Promise.all(meshes),
            materials: await Promise.all(materials)
        }
    }

}

export namespace ThreeViewerModel {
    export type Material = {
        title: LocalizedText;
        description: LocalizedText;
        meshMaterials: MeshStandardMaterial[]
    };
}


export type ThreeViewerObject3D = ThreeViewerModel | ThreeViewerLight;

/**
 * A threejs group with typed children
 */
export class ThreeViewerGroup<T extends ThreeViewerObject3D> extends Group {
    constructor() { super(); }
    children: T[];
    add(...o: T[]): this { super.add(...o); return this; }
    remove(...o: T[]): this { super.remove(...o); return this; }
}



// TEmp

/*
class A {
    aFunc(): void { }
}

class B {
    bFunc(): void { }
}


type AB = A & B;

let arr = new Array<AB>();

let a: AB = new A() as AB;
let b: AB = new B() as AB;

arr.push(a);

a.aFunc();




*/