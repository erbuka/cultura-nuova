import { Component, OnInit, Inject, ViewChild, ElementRef, NgZone, OnDestroy, Output, EventEmitter } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ThreeViewerPinLayer, loadGeometryFromWavefront, createStandardMaterial } from '../three-viewer';
import { WebGLRenderer, Scene, Mesh, BoxBufferGeometry, PerspectiveCamera, MeshStandardMaterial, DirectionalLight } from 'three';
import { ContextService } from 'src/app/context.service';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-pin-layer-editor',
  templateUrl: './pin-layer-editor.component.html',
  styleUrls: ['./pin-layer-editor.component.scss']
})
export class PinLayerEditorComponent implements OnInit, OnDestroy {

  @ViewChild("pinPreviewContainer", { read: ElementRef, static: true }) pinPreviewContainer: ElementRef;

  cdkMoveItemInArray = moveItemInArray;

  @Output() pinLayerDeleted: EventEmitter<ThreeViewerPinLayer> = new EventEmitter();

  set selectedLayer(l: ThreeViewerPinLayer) {
    this._selectedLayer = l;
    if (l != null) {
      this.previewMesh.geometry = l.geometry;
      this.previewMesh.material = l.material;
    }
  }

  get selectedLayer(): ThreeViewerPinLayer {
    return this._selectedLayer;
  }

  private _selectedLayer: ThreeViewerPinLayer = null;
  private renderer: WebGLRenderer = null;
  private scene: Scene = new Scene();
  private previewMesh: Mesh = null;
  private camera: PerspectiveCamera = null;
  private light: DirectionalLight = null;
  private orbitControls: OrbitControls = null;

  constructor(private dialogRef: MatDialogRef<PinLayerEditorComponent>, private zone: NgZone, private context: ContextService,
    @Inject(MAT_DIALOG_DATA) public pinLayers: ThreeViewerPinLayer[]) { }

  deleteLayer(l: ThreeViewerPinLayer): void {
    this.pinLayers.splice(this.pinLayers.findIndex(x => x === l), 1);
    this.pinLayerDeleted.emit(l);
    if (this.selectedLayer === l)
      this.selectedLayer = null;
  }

  ngOnDestroy(): void {
    this.scene = null;
    this.camera = null;
    this.previewMesh = null;
    this.renderer = null;
    this.pinLayers = null;
    this.orbitControls.dispose();
  }

  ngOnInit(): void {

    this.renderer = new WebGLRenderer();
    this.renderer.setClearColor(0xcccccc);

    let container: HTMLElement = this.pinPreviewContainer.nativeElement;

    let size = container.getBoundingClientRect();
    let canvas = this.renderer.domElement;

    canvas.style.display = "block";
    canvas.width = size.width;
    canvas.height = size.height;

    container.appendChild(canvas);

    this.previewMesh = new Mesh(new BoxBufferGeometry(1, 1, 1), createStandardMaterial({ color: 0xffffff }));

    this.light = new DirectionalLight(0xffffff);

    this.scene = new Scene();
    this.scene.add(this.previewMesh);
    this.scene.add(this.light);


    this.camera = new PerspectiveCamera(45);
    this.camera.position.set(0, 0, -3);
    this.camera.lookAt(0, 0, 0);

    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.orbitControls.enablePan = false;

    if (this.pinLayers.length > 0)
      this.selectedLayer = this.pinLayers[0];

    this.zone.runOutsideAngular(() => this.render());
  }

  newPinLayer(): void {
    let layer = new ThreeViewerPinLayer();
    layer.title = `PinLayer #${this.pinLayers.length}`;
    this.pinLayers.push(layer);
  }

  async selectModel(): Promise<void> {
    let data = await this.context.fileChooser({ type: "arraybuffer", accept: ".obj" });
    let geom = await loadGeometryFromWavefront(data);
    this.selectedLayer.geometry.copy(geom[0].geometry);
  }

  private render(): void {

    const container = this.pinPreviewContainer.nativeElement as HTMLElement;
    const [w, h] = [container.clientWidth, container.clientHeight];

    if (!this.renderer)
      return;

    requestAnimationFrame(this.render.bind(this));

    this.light.position.copy(this.camera.position);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setViewport(0, 0, w, h);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

}
