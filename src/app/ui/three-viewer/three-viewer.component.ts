import { Component, OnInit, Input, ViewChild, ElementRef, NgZone, HostListener } from '@angular/core';
import { ThreeViewerItem } from 'src/app/types/three-viewer-item';
import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss']
})
export class ThreeViewerComponent implements OnInit {

  @ViewChild("containerRef", { read: ElementRef, static: true }) containterRef: ElementRef;
  @Input() item: ThreeViewerItem;

  camera: PerspectiveCamera = null;
  scene: Scene = null;
  renderer: WebGLRenderer = null;

  constructor(private zone: NgZone) { }

  async ngOnInit() {
    this.renderer = new WebGLRenderer({ premultipliedAlpha: false, alpha: true });
    this.containterRef.nativeElement.appendChild(this.renderer.domElement);

    this.camera = new PerspectiveCamera();
    this.camera.matrixAutoUpdate = true;

    this.camera.position.set(0, 400, 400);
    this.camera.lookAt(0, 0, 0);

    this.scene = await this.loadGLTFScene("assets/main/modello-3d/trees1.gltf");

    this.zone.runOutsideAngular(() => {
      this.resize();
      this.render();
    });

  }


  render() {
    requestAnimationFrame(this.render.bind(this));

    let renderer = this.renderer;

    renderer.setClearColor(0, 0);
    renderer.clear(true, true);
    renderer.render(this.scene, this.camera);


  }

  @HostListener("window:resize")
  resize() {
    let w = this.renderer.domElement.width = this.containterRef.nativeElement.clientWidth;
    let h = this.renderer.domElement.height = this.containterRef.nativeElement.clientHeight;
    this.renderer.setViewport(0, 0, w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

  }

  onPan(evt) {
    console.log(evt);
  }

  private loadGLTFScene(url: string): Promise<Scene> {
    return new Promise((resolve, reject) => {
      let loader = new GLTFLoader();

      loader.load(url, (gltf) => {
        let scene = new Scene();
        scene.add(gltf.scene);
        resolve(scene);
      });

    });
  }


}
