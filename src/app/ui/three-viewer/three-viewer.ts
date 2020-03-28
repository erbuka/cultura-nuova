import { BufferGeometry, Mesh, Float32BufferAttribute, Group, MeshStandardMaterial } from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';
import { ThreeViewerItemModel } from 'src/app/types/three-viewer-item';
import { LocalizedText } from 'src/app/types/item';



export const loadPlyMesh: (url: string) => Promise<BufferGeometry> = (url) => {
    return new Promise((resolve, reject) => {
        let loader = new PLYLoader();
        loader.load(url, (geom) => resolve(geom), null, (err) => reject(err));
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

        loader.setMaterialPerSmoothingGroup(false);

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

        loader.setCallbackOnError((err) => reject(err));

        loader.parse(wfData);

        resolve(result);

    });
}

export type ThreeViewerObject3D = ThreeViewerComponentModel;


interface Serializable<T> {
    serialize(binData: BinaryFiles): Promise<T>;
}

export class BinaryFiles {

    files: Map<string, ArrayBuffer> = new Map();

    private nextId: number = 0;

    store(data: ArrayBuffer): string {
        let name = `./${this.nextId++}.bin`
        this.files.set(name, data);
        return name;
    }

}


export class ThreeViewerComponentModel extends Group implements Serializable<ThreeViewerItemModel> {

    isModel: boolean = true;

    title: LocalizedText = "";
    description: LocalizedText = "";

    private _opacity: number = 1;
    private _currentMaterialIndex: number = null;

    private _materials: ThreeViewerComponentModel.Material[] = [];

    set currentMaterial(index: number) {
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

    get materials(): ThreeViewerComponentModel.Material[] {
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

        let meshes = await Promise.all(this.meshes.map(async mesh => {
            let data = await exportPlyMesh(mesh);
            let fileName = binFiles.store(data);
            return {
                name: mesh.name,
                file: fileName
            }
        }));

        let materials = this._materials.map(m => {
            return {
                title: m.title,
                description: m.description,
                meshMaterials: m.meshMaterials.map(x => {
                    return {
                        color: x.color.getHex()
                    }
                })
            }
        });

        return {
            title: this.title,
            description: this.description,
            position: [pos.x, pos.y, pos.z],
            rotation: [rot.x, rot.y, rot.z],
            scale: [scl.x, scl.y, scl.z],
            meshes: meshes,
            materials: materials
        }
    }

}

export class TypedGroup<T extends ThreeViewerObject3D> extends Group {
    constructor() { super(); }
    children: T[];
    add(...o: T[]): this { super.add(...o); return this; }
    remove(...o: T[]): this { super.remove(...o); return this; }
}


export namespace ThreeViewerComponentModel {
    export type Material = {
        title: LocalizedText;
        description: LocalizedText;
        meshMaterials: MeshStandardMaterial[]
    };
}

