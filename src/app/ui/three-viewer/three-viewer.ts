import { BufferGeometry, Mesh, Float32BufferAttribute, Group, MeshStandardMaterial, TextureLoader, Texture, DirectionalLight, AmbientLight, Color, Sprite, SpriteMaterial, Camera, CameraHelper, OrthographicCamera, Vector3, Scene, WebGLRenderTarget, BoxBufferGeometry, Geometry, MeshBasicMaterial } from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';
import { ThreeViewerItemModel, ThreeViewerItemLight, ThreeViewerItemAmbientLight, ThreeViewerItemLightType, ThreeViewerItemDirectionalLight, ThreeViewerItemPinLayer, ThreeViewerItemPin } from 'src/app/types/three-viewer-item';
import { LocalizedText } from 'src/app/types/item';
import { ErrorEvent } from 'src/app/context.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';

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

export const exportPlyMesh: (meshOrGeometry: Mesh | BufferGeometry) => Promise<ArrayBuffer> = (meshOrGeometry) => {
    let plyExporter = new PLYExporter();

    // This is done because PLYExporter applies the world matrix
    // to the mesh before exporing it, and we don't need that since
    // we store position, rotation and scale in the parent group
    let tempMesh = meshOrGeometry instanceof Mesh ? new Mesh(meshOrGeometry.geometry) : new Mesh(meshOrGeometry);

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

interface EditorMode {
    setEditorMode(enabled: boolean);
}

interface OnAdd {
    onAdd(scene: Scene): void;
}

interface OnRemove {
    onRemove(scene: Scene): void;
}

/**
 * Pin Layer
 */
export class ThreeViewerPinLayer implements Serializable<ThreeViewerItemPinLayer> {
    title: LocalizedText = "";
    description: LocalizedText = "";
    geometry: BufferGeometry = new BoxBufferGeometry(1, 1, 1);

    get color(): Color {
        return this._material.color;
    }

    get material(): MeshBasicMaterial {
        return this._material;
    }

    private _material: MeshBasicMaterial = new MeshBasicMaterial({ color: 0xffffff });

    constructor() { }

    async serialize(binData: BinaryFiles): Promise<ThreeViewerItemPinLayer> {
        return {
            title: this.title,
            description: this.description,
            color: this.color.getHex(),
            geometry: await binData.store(await exportPlyMesh(this.geometry), "ply")
        }
    }
}

/**
 * Pin
 */

export class ThreeViewerPin extends Mesh implements Serializable<ThreeViewerItemPin>, EditorMode {

    isThreeViewerPin: boolean = true;
    title: LocalizedText = "";
    description: LocalizedText = "";

    set layer(layer: ThreeViewerPinLayer) {
        this.geometry = layer.geometry;
        (this.material as MeshBasicMaterial).color = layer.color;
        this._layer = layer;
    }

    get layer(): ThreeViewerPinLayer {
        return this._layer;
    }

    private _layer: ThreeViewerPinLayer = null;

    constructor(private _layers: ThreeViewerPinLayer[]) {
        super(new BoxBufferGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0xffffff }));
    }


    setEditorMode(enabled: boolean) { }

    async serialize(binData: BinaryFiles): Promise<ThreeViewerItemPin> {
        let pos = this.position;
        let scl = this.scale;
        let rot = this.rotation;

        return {
            title: this.title,
            description: this.description,
            position: [pos.x, pos.y, pos.z],
            rotation: [rot.x, rot.y, rot.z],
            scale: [scl.x, scl.y, scl.z],
            layerIndex: this._layers.findIndex(x => x === this._layer)
        }
    }

}


/**
 * Light
 */
export class ThreeViewerLight extends Group implements Serializable<ThreeViewerItemLight>, EditorMode, OnAdd, OnRemove {

    isThreeViewerLight: boolean = true;

    title: LocalizedText = "";
    description: LocalizedText = "";

    lightType: ThreeViewerItemLightType;

    light: DirectionalLight | AmbientLight;

    gizmo: Sprite;
    cameraHelper: CameraHelper;

    _shadowCameraSize: Vector3 = new Vector3();

    set shadowMapWidth(v: number) {
        let n: number = typeof v === "string" ? parseFloat(v) || 0 : v;
        this.light.shadow.mapSize.width = Math.max(n, 512);
        this.updateShadowMap();
    }

    set shadowMapHeight(v: number) {
        let n: number = typeof v === "string" ? parseFloat(v) || 0 : v;
        this.light.shadow.mapSize.height = Math.max(n, 512); this.updateShadowMap();
        this.updateShadowMap();
    }

    get shadowMapWidth(): number { return this.light.shadow.mapSize.width; }
    get shadowMapHeight(): number { return this.light.shadow.mapSize.height; }

    get shadowCameraSize(): Vector3 {
        let camera = this.light.shadow.camera as OrthographicCamera;
        return this._shadowCameraSize.set(camera.right - camera.left, camera.top - camera.bottom, camera.far - camera.near);
    }

    set shadowCameraSize(v: Vector3) {
        let camera = this.light.shadow.camera as OrthographicCamera;

        camera.left = -v.x / 2.0; camera.right = v.x / 2.0;
        camera.bottom = -v.y / 2.0; camera.top = v.y / 2.0;
        camera.near = -v.z / 2.0; camera.far = v.z / 2.0;

        this._shadowCameraSize.set(camera.right - camera.left, camera.top - camera.bottom, camera.far - camera.near);

        camera.updateProjectionMatrix();
        this.cameraHelper.update();
    }

    constructor(lightType: ThreeViewerItemLightType) {
        super();
        this.lightType = lightType;
        this.initialize();
    }


    onAdd(scene: Scene): void {
        if (this.cameraHelper)
            scene.add(this.cameraHelper);
    }
    onRemove(scene: Scene): void {
        if (this.cameraHelper)
            scene.remove(this.cameraHelper);
    }

    get color(): Color {
        return this.light.color;
    }

    setEditorMode(enabled: boolean) {
        if (this.gizmo)
            this.gizmo.visible = enabled;

        if (this.cameraHelper)
            this.cameraHelper.visible = enabled;
    }

    updateMatrixWorld(force?: boolean): void {
        super.updateMatrixWorld(force);

    }


    private updateShadowMap(): void {
        const shadow = this.light.shadow;
        if (shadow.map) {
            (shadow.map as WebGLRenderTarget).setSize(shadow.mapSize.width, shadow.mapSize.height);
        }
    }

    private createGizmo(): void {

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

        this.gizmo = gizmo;
    }

    private createCameraHelper(): void {
        this.cameraHelper = new CameraHelper(this.light.shadow.camera);
    }

    private initialize(): void {
        switch (this.lightType) {
            case "ambient":
                this.light = new AmbientLight();
                break;
            case "directional":
                this.light = new DirectionalLight();
                this.light.shadow.mapSize.set(1024, 1024);
                window["shadow"] = this.light.shadow;
                this.createCameraHelper();
                this.createGizmo();
                break;
            default:
                throw new Error(`Unknown light type: ${this.lightType}`);
        }


        this.add(this.light);
    }

    async serialize(binData: BinaryFiles): Promise<ThreeViewerItemLight> {
        let pos = this.position;
        let rot = this.rotation;
        let scl = this.scale;


        switch (this.lightType) {
            case "ambient":
                return {
                    title: this.title,
                    description: this.description,
                    position: [pos.x, pos.y, pos.z],
                    rotation: [rot.x, rot.y, rot.z],
                    scale: [scl.x, scl.y, scl.z],
                    type: "ambient",
                    color: this.color.getHex(),
                };
            case "directional":
                return {
                    title: this.title,
                    description: this.description,
                    position: [pos.x, pos.y, pos.z],
                    rotation: [rot.x, rot.y, rot.z],
                    scale: [scl.x, scl.y, scl.z],
                    type: "directional",
                    color: this.color.getHex(),
                    castShadow: this.light.castShadow,
                    shadowMapWidth: this.light.shadow.mapSize.width,
                    shadowMapHeight: this.light.shadow.mapSize.height,
                    shadowCameraSize: [this.shadowCameraSize.x, this.shadowCameraSize.y, this.shadowCameraSize.z]
                };
            default:
                throw new Error(`Unknwon light type: ${this.lightType}`);
        }
    }

}


/**
 * Model
 */
export class ThreeViewerModel extends Group implements Serializable<ThreeViewerItemModel>, EditorMode {

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

    setEditorMode(enabled: boolean) { }

    swapMaterials(previousIdx: number, currentIdx: number): void {
        let current = this._materials[this.currentMaterial];
        moveItemInArray(this._materials, previousIdx, currentIdx);
        this.currentMaterial = this._materials.findIndex(x => x === current);
    }

    removeMaterial(idx: number) {
        if (this._materials.length <= 1)
            return;

        let current = this._materials[this.currentMaterial];

        this._materials.splice(idx, 1);

        if (this.currentMaterial === idx) {
            this.currentMaterial = 0;
        } else {
            this.currentMaterial = this._materials.findIndex(x => x === current);
        }

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


export type ThreeViewerObject3D = (ThreeViewerModel | ThreeViewerLight | ThreeViewerPin) & EditorMode & Partial<OnAdd> & Partial<OnRemove>;

/**
 * A threejs group with typed children
 */
export class ThreeViewerGroup<T extends ThreeViewerObject3D> extends Group {
    constructor() { super(); }
    children: T[];
    add(...o: T[]): this { super.add(...o); return this; }
    remove(...o: T[]): this { super.remove(...o); return this; }
}