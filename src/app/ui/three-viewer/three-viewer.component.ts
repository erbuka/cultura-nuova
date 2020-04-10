import { Component, OnInit, Input, ViewChild, ElementRef, NgZone, HostListener, OnDestroy, Host, ChangeDetectorRef } from '@angular/core';
import { ThreeViewerItem, ThreeViewerItemLightType } from 'src/app/types/three-viewer-item';
import { Scene, WebGLRenderer, PerspectiveCamera, Clock, Raycaster, Mesh, MeshStandardMaterial, GridHelper, Vector3, DirectionalLight, PCFShadowMap, Vector2, Object3D, CameraHelper } from 'three';
import { environment } from 'src/environments/environment';
import { ContextService } from 'src/app/context.service';

import { TouchControls } from './touch-controls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MaterialEditorComponent } from './material-editor/material-editor.component';

import { BinaryFiles, ThreeViewerObject3D, ThreeViewerGroup, ThreeViewerModel, loadPlyMesh, loadGeometryFromWavefront, loadTexture, ThreeViewerLight, loadStaticTextures } from './three-viewer';
import { HammerInput } from '@angular/material/core';

type EditorTab = "models" | "lights";


@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss']
})
export class ThreeViewerComponent implements OnInit, OnDestroy {

  @ViewChild("containerRef", { read: ElementRef, static: true }) containterRef: ElementRef;
  @Input() item: ThreeViewerItem;

  activeEditorHierarchyGroup: ThreeViewerGroup<any> = null;
  lights: ThreeViewerGroup<ThreeViewerLight> = new ThreeViewerGroup();
  models: ThreeViewerGroup<ThreeViewerModel> = new ThreeViewerGroup();

  clock: Clock = new Clock(true);
  camera: PerspectiveCamera = null;
  scene: Scene = null;
  renderer: WebGLRenderer = null;

  touchControls: TouchControls = null;
  orbitControls: OrbitControls = null;
  transformControls: TransformControls = null;
  gridHelper: GridHelper = null;

  rayscaster: Raycaster = null;

  width: number = 0;
  height: number = 0;

  allowEditorMode: boolean = false;
  showLoading: boolean = true;

  set editorActiveTab(tab: EditorTab) {
    this._editorActiveTab = tab;
    switch (tab) {
      case "models":
        this.activeEditorHierarchyGroup = this.models;
        break;
      case "lights":
        this.activeEditorHierarchyGroup = this.lights;
        break;
      default:
        throw new Error(`Unknwon tab: ${tab}`);
    }
  }

  get editorActiveTab(): EditorTab {
    return this._editorActiveTab;
  }


  set editorMode(value: boolean) {
    this._editorMode = value;

    this.touchControls.enabled = !value;
    this.orbitControls.enabled = value;
    this.transformControls.enabled = value;
    this.gridHelper.visible = value;
    this.selectedObject = null;

    this.models.children.forEach(m => m.setEditorMode(value));
    this.lights.children.forEach(l => l.setEditorMode(value));

  }

  get editorMode(): boolean {
    return this._editorMode;
  }

  set selectedObject(obj: any) {
    this._selectedObject = obj;
    obj ? this.transformControls.attach(obj) : this.transformControls.detach();
  }

  get selectedObject(): any {
    return this._selectedObject;
  }

  private _selectedObject: any = null;
  private _editorMode: boolean = false;
  private _editorActiveTab: EditorTab = "models";


  constructor(private zone: NgZone, public context: ContextService, private httpClient: HttpClient, private snackBar: MatSnackBar,
    private dialog: MatDialog, private cdRef: ChangeDetectorRef) {
    this.allowEditorMode = !environment.production;
    this.editorActiveTab = "models";
  }

  async ngOnInit() {

    this.renderer = new WebGLRenderer({ premultipliedAlpha: false, alpha: true, antialias: true });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;


    this.containterRef.nativeElement.appendChild(this.renderer.domElement);

    this.rayscaster = new Raycaster();

    this.camera = new PerspectiveCamera();
    this.camera.matrixAutoUpdate = true;

    this.scene = new Scene();

    this.gridHelper = new GridHelper(20, 20);

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (evt) => this.orbitControls.enabled = !evt.value);

    this.zone.runOutsideAngular(() => {

      this.orbitControls = new OrbitControls(this.camera, this.containterRef.nativeElement);

      this.touchControls = new TouchControls(this.camera, this.containterRef.nativeElement);
      this.touchControls.enabled = false;
      this.touchControls.wheelZoomStep = 5;
      this.touchControls.zoomSpeed = 500;

    });

    this.scene.add(this.transformControls);
    this.scene.add(this.gridHelper);
    this.scene.add(this.models);
    this.scene.add(this.lights);

    await loadStaticTextures();
    await this.loadItem();
    this.showLoading = false;
    this.editorMode = false;


    this.zone.runOutsideAngular(async () => {
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

    // I'm not using array functions here (map, forEach, ...) becaue
    // this is an async function and it would make the code a bit harder
    // to read

    if (this.item.models) {
      for (let modelDef of this.item.models) {
        let model = new ThreeViewerModel();
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

        for (let meshDef of modelDef.meshes) {
          let geometry = await loadPlyMesh(this.context.resolveUrl(meshDef.file, this.item));
          let mesh = new Mesh(geometry, new MeshStandardMaterial());

          mesh.castShadow = true;
          mesh.receiveShadow = true;

          mesh.name = meshDef.name;
          model.add(mesh);
        }

        for (let materialDef of modelDef.materials) {

          let materials: MeshStandardMaterial[] = [];

          for (let meshMaterialDef of materialDef.meshMaterials) {
            let mat = new MeshStandardMaterial({ transparent: true, premultipliedAlpha: false, color: meshMaterialDef.color });

            if (meshMaterialDef.map)
              mat.map = await loadTexture(this.context.resolveUrl(meshMaterialDef.map, this.item));

            if (meshMaterialDef.normalMap)
              mat.normalMap = await loadTexture(this.context.resolveUrl(meshMaterialDef.normalMap, this.item));

            materials.push(mat);
          }

          model.addMaterial(materialDef.title, materialDef.description, materials);
        }

        model.currentMaterial = modelDef.activeMaterial || 0;

        this.models.add(model);

      }
    }

    // Load lights

    this.lights.remove(...this.lights.children);

    if (this.item.lights) {

      for (let lightDef of this.item.lights) {
        let [pos, rot, scl] = [lightDef.position, lightDef.rotation, lightDef.scale];
        let light = new ThreeViewerLight(lightDef.type);

        light.title = lightDef.title;
        light.description = lightDef.description || "";

        light.color.setHex(lightDef.color);

        if (light.lightType === "directional") {
          let l = light.light as any;

          l.castShadow = true;
          l.shadowCameraVisible = true;

        }

        if (pos)
          light.position.fromArray(pos);

        if (rot)
          light.rotation.fromArray(rot);

        if (scl)
          light.scale.fromArray(scl);

        this.lights.add(light);

      }
    }


    // Load other stuff

  }

  async loadModelFromWaveFront() {

    let data: ArrayBuffer = await this.context.fileChooser({ type: "arraybuffer", accept: ".obj" });
    let geometries = await loadGeometryFromWavefront(data);
    let result = new ThreeViewerModel();

    result.title = "Object";

    geometries.forEach(g => {
      let mesh = new Mesh(g.geometry);
      mesh.name = g.name;
      result.add(mesh);
    });

    result.addMaterial("Default", "", result.meshes.map(x => new MeshStandardMaterial({
      premultipliedAlpha: false,
      transparent: true,
      color: 0xffffff
    })));

    this.models.add(result);

  }

  addLight(type: ThreeViewerItemLightType): void {
    let light = new ThreeViewerLight(type);
    light.title = "Light";
    this.lights.add(light);
  }

  onObjectRemoved(obj: ThreeViewerObject3D) {
    if (obj === this.selectedObject) {
      this.selectedObject = null;
    }
  }

  editMaterials(model: ThreeViewerModel): void {
    this.dialog.open(MaterialEditorComponent, {
      minWidth: "1024px",
      width: "1024px",
      position: {
        top: "100px"
      },
      data: {
        model: model
      }
    })
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


    this.showLoading = true;

    this.camera.getWorldDirection(lookAt);
    lookAt.add(this.camera.position);


    let exportItem: ThreeViewerItem = {
      type: "3d",
      camera: {
        position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
        lookAt: [lookAt.x, lookAt.y, lookAt.z]
      },
      models: await Promise.all(this.models.children.map(async model => await model.serialize(binFiles))),
      lights: await Promise.all(this.lights.children.map(async light => await light.serialize(binFiles)))
    };

    await this.httpClient.post(this.context.resolveUrl("./item.json", this.item),
      new Blob([JSON.stringify(exportItem)], { type: "text/html" }),
      { responseType: "text" }).toPromise();

    for (let [name, data] of binFiles.files) {
      await this.httpClient.post(this.context.resolveUrl(name, this.item),
        new Blob([data], { type: "application/octet-stream" }),
        { responseType: "text" }).toPromise()
    }

    this.showLoading = false;

    this.snackBar.open("Scene saved!");

  }


  onCanvasClick(evt: PointerEvent): void {

    if (this.editorMode) {

      let rect = this.renderer.domElement.getBoundingClientRect();
      let mouse = {
        x: (evt.clientX - rect.left) / rect.width * 2.0 - 1.0,
        y: (evt.clientY - rect.top) / rect.height * -2.0 + 1.0,
      };

      let allObjects: Object3D[] = [...this.models.children, ...this.lights.children];

      this.rayscaster.setFromCamera(mouse, this.camera);
      let intersections = this.rayscaster.intersectObjects(allObjects, true);

      for (let intersection of intersections) {

        if (intersection.object instanceof CameraHelper)
          continue;

        let first = intersection.object;

        while (first != null && !allObjects.includes(first))
          first = first.parent;

        if (first != null) {
          this.selectedObject = first;
          break
        }
      }


    }
  }

  private updateCamera(dt: number): void {
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  @HostListener("window:resize")
  resize() {
    this.width = this.renderer.domElement.width = this.containterRef.nativeElement.clientWidth;
    this.height = this.renderer.domElement.height = this.containterRef.nativeElement.clientHeight;
  }

}
