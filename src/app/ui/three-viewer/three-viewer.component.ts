import { Component, OnInit, Input, ViewChild, ElementRef, NgZone, HostListener, OnDestroy } from '@angular/core';
import { ThreeViewerItem, ThreeViewerItemModel } from 'src/app/types/three-viewer-item';
import { Scene, WebGLRenderer, PerspectiveCamera, Clock, Raycaster, Mesh, Group, BufferGeometry, MeshStandardMaterial, Float32BufferAttribute, Object3D, DirectionalLight, GridHelper, Vector3 } from 'three';
import { environment } from 'src/environments/environment';
import { ContextService } from 'src/app/context.service';

import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';
import { TouchControls } from './touch-controls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { LocalizedText } from 'src/app/types/item';
import { HttpClient } from '@angular/common/http';


const loadPlyMesh: (url: string) => Promise<BufferGeometry> = (url) => {
  return new Promise((resolve, reject) => {
    let loader = new PLYLoader();
    loader.load(url, (geom) => resolve(geom), null, (err) => reject(err));
  });
}

const exportPlyMesh: (mesh: Mesh) => Promise<ArrayBuffer> = (mesh: Mesh) => {
  let plyExporter = new PLYExporter();

  // This is done because PLYExporter applies the world matrix
  // to the mesh before exporing it, and we don't need that since
  // we store position, rotation and scale in the parent group
  let tempMesh = new Mesh(mesh.geometry);

  return new Promise((resolve, reject) => {
    plyExporter.parse(tempMesh, (result: any) => resolve(result as ArrayBuffer), { binary: true })
  });
};

const loadGeometryFromWavefront: (wfData: ArrayBuffer) => Promise<{ name: string, geometry: BufferGeometry }[]> = async (wfData) => {
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

interface Serializable<T> {
  serialize(binData: BinaryFiles): Promise<T>;
}

class BinaryFiles {

  files: Map<string, ArrayBuffer> = new Map();

  private nextId: number = 0;

  store(data: ArrayBuffer): string {
    let name = `./${this.nextId++}.bin`
    this.files.set(name, data);
    return name;
  }

}


class TypedGroup<T extends ThreeViewerObject3D> extends Group {
  constructor() { super(); }
  children: T[];
  add(...o: T[]): this { super.add(...o); return this; }
  remove(...o: T[]): this { super.remove(...o); return this; }
}

class ThreeViewerComponentModel extends Group implements Serializable<ThreeViewerItemModel> {

  isModel:boolean = true;

  title: LocalizedText = "";
  description: LocalizedText = "";

  _opacity: number = 1;

  _materials: {
    title: string;
    description: string;
  }[] = [];

  set opacity(value: number) {
    this._opacity = value;
    this.meshes.forEach(mesh => (mesh.material as MeshStandardMaterial).opacity = value);
  }

  get opacity(): number {
    return this._opacity;
  }

  get meshes(): Mesh[] {
    return <Mesh[]>this.children.filter(x => x instanceof Mesh);
  }

  constructor() {
    super();
  }

  async serialize(binFiles: BinaryFiles): Promise<ThreeViewerItemModel> {
    let pos = this.position;
    let scl = this.scale;
    let rot = this.rotation;

    return {
      title: this.title,
      description: this.description,
      position: [pos.x, pos.y, pos.z],
      rotation: [rot.x, rot.y, rot.z],
      scale: [scl.x, scl.y, scl.z],
      meshes: await Promise.all(this.meshes.map(async mesh => {
        let data = await exportPlyMesh(mesh);
        let fileName = binFiles.store(data);
        return {
          name: mesh.name,
          file: fileName
        }
      }))
    }
  }

}


type ThreeViewerObject3D = ThreeViewerComponentModel;



@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss']
})
export class ThreeViewerComponent implements OnInit, OnDestroy {

  @ViewChild("containerRef", { read: ElementRef, static: true }) containterRef: ElementRef;
  @Input() item: ThreeViewerItem;

  models: TypedGroup<ThreeViewerComponentModel> = new TypedGroup();

  _selectedObject: ThreeViewerObject3D = null;

  clock: Clock = new Clock(true);
  camera: PerspectiveCamera = null;
  scene: Scene = null;
  renderer: WebGLRenderer = null;

  touchControls: TouchControls = null;
  orbitControls: OrbitControls = null;
  transformControls: TransformControls = null;

  rayscaster: Raycaster = null;

  width: number = 0;
  height: number = 0;

  editorMode: boolean = false;

  set selectedObject(obj: ThreeViewerObject3D) {
    this._selectedObject = obj;
    if (obj && this.editorMode) {
      this.transformControls.attach(obj);
    }
  }

  get selectedObject(): ThreeViewerObject3D {
    return this._selectedObject;
  }

  constructor(private zone: NgZone, public context: ContextService, private httpClient: HttpClient) {
    this.editorMode = !environment.production;
  }

  async ngOnInit() {


    this.renderer = new WebGLRenderer({ premultipliedAlpha: false, alpha: true });
    this.containterRef.nativeElement.appendChild(this.renderer.domElement);


    this.rayscaster = new Raycaster();

    this.camera = new PerspectiveCamera();
    this.camera.matrixAutoUpdate = true;

    this.scene = new Scene();
    this.scene.add(this.models);
    {
      let l = new DirectionalLight();
      l.position.set(1, 2, 1);
      this.scene.add(l);
    }

    if (this.editorMode) {
      this.orbitControls = new OrbitControls(this.camera, this.containterRef.nativeElement);
      this.orbitControls.enabled = this.editorMode;

      this.transformControls = new TransformControls(this.camera, this.renderer.domElement);

      this.transformControls.addEventListener('dragging-changed', (evt) => {
        this.orbitControls.enabled = !evt.value;
      });

      this.scene.add(this.transformControls);

      this.scene.add(new GridHelper(20, 20));

    } else {
      this.touchControls = new TouchControls(this.camera, this.containterRef.nativeElement);
      this.touchControls.wheelZoomStep = 100;
      this.touchControls.zoomSpeed = 500;
    }

    await this.loadItem();

    this.zone.runOutsideAngular(() => {
      this.resize();
      this.render();
    });

  }

  ngOnDestroy(): void {
    if (this.touchControls)
      this.touchControls.dispose();
  }

  async loadItem(): Promise<void> {
    // Setup camera

    this.camera.position.fromArray(this.item.camera.position);
    this.camera.lookAt(this.item.camera.lookAt[0], this.item.camera.lookAt[1], this.item.camera.lookAt[2]);

    // Load models
    this.models.remove(...this.models.children);

    for (let modelDef of this.item.models) {
      let model = new ThreeViewerComponentModel();
      let pos = modelDef.position;
      let rot = modelDef.rotation;
      let scl = modelDef.scale;

      model.title = modelDef.title;
      model.description = modelDef.description || "";

      if (pos)
        model.position.fromArray(pos);

      if (rot)
        model.rotation.fromArray(rot);

      if (scl)
        model.scale.fromArray(scl);

      if (modelDef.meshes) {
        for (let meshDef of modelDef.meshes) {
          let geometry = await loadPlyMesh(this.context.resolveUrl(meshDef.file, this.item));
          model.add(new Mesh(geometry, new MeshStandardMaterial()));
        }
      }

      this.models.add(model);

    }

    // Load lights

    // Load other stuff

  }

  async createModelFromWavefront() {

    let data: ArrayBuffer = await this.context.fileChooser({ type: "arraybuffer", accept: ".obj" });
    let geometries = await loadGeometryFromWavefront(data);
    let result = new ThreeViewerComponentModel();

    result.title = "Object";

    geometries.forEach(g => {
      let mesh = new Mesh(g.geometry, new MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        premultipliedAlpha: false
      }));
      mesh.name = g.name;
      result.add(mesh);
    });

    this.models.add(result);

  }

  render() {
    requestAnimationFrame(this.render.bind(this));

    NgZone.assertNotInAngularZone();

    let dt: number = this.clock.getDelta();
    let renderer = this.renderer;
    let w = this.width, h = this.height;

    this.renderer.setViewport(0, 0, w, h);

    this.updateCamera(dt);

    renderer.setClearColor(0, 0);
    renderer.clear(true, true);
    renderer.render(this.scene, this.camera);

  }

  async export(): Promise<void> {

    let lookAt = new Vector3();
    let binFiles = new BinaryFiles();

    this.camera.getWorldDirection(lookAt);
    lookAt.add(this.camera.position);


    let exportItem: ThreeViewerItem = {
      type: "3d",
      camera: {
        position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
        lookAt: [lookAt.x, lookAt.y, lookAt.z]
      },
      models: await Promise.all(this.models.children.map(async model => await model.serialize(binFiles)))

    };

    await this.httpClient.post(this.context.resolveUrl("./item.json", this.item),
      new Blob([JSON.stringify(exportItem)], { type: "text/html" }),
      { responseType: "text" }).toPromise();

    for (let [name, data] of binFiles.files) {
      await this.httpClient.post(this.context.resolveUrl(name, this.item),
        new Blob([data], { type: "application/octet-stream" }),
        { responseType: "text" }).toPromise()
    }

  }

  @HostListener("window:resize")
  resize() {
    this.width = this.renderer.domElement.width = this.containterRef.nativeElement.clientWidth;
    this.height = this.renderer.domElement.height = this.containterRef.nativeElement.clientHeight;
  }

  private updateCamera(dt: number): void {
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }




}
