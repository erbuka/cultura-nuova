import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import * as L from 'leaflet';
import { DeepZoomItem, DeepZoomItemDeepImageLayer, DeepZoomItemVectorLayer } from 'src/app/types/deep-zoom-item';
import { DeepZoomLayerControls, DeepZoomTools, DeepZoomMeasureUnit } from '../deep-zoom';
import { Router } from '@angular/router';
import { LeafletDeepImageLayer } from './leaflet-deep-image-layer';



interface LeafletLayerControls extends DeepZoomLayerControls {
  title: string;
  opacity: number;
  visible: boolean;
  exclusive: boolean;
  previewImage: string;
  nativeLayer: any;

  update(): void;

}

@Component({
  selector: 'app-leaflet-deep-zoom',
  templateUrl: './leaflet-deep-zoom.component.html',
  styleUrls: ['./leaflet-deep-zoom.component.scss']
})
export class LeafletDeepZoomComponent implements OnInit {

  @ViewChild("mapContainer", { static: true }) mapContainer: ElementRef;

  @Input() item: DeepZoomItem = null;

  map = null;
  layerControls: LeafletLayerControls[] = null;
  _tool: DeepZoomTools = "pan";
  _measureUnit: DeepZoomMeasureUnit = "pixels";

  constructor(private context: ContextService, private router: Router) { }


  set measureUnit(m: DeepZoomMeasureUnit) {
    this._measureUnit = m;
    this.tool = "measure";
  }

  get measureUnit(): DeepZoomMeasureUnit {
    return this._measureUnit;
  }

  set tool(t: DeepZoomTools) {
    this._tool = t;

    switch (t) {
      case "measure":
        this.map.dragging.disable();
        break;
      case "pan":
        this.map.dragging.enable();
        break;
    }

  }

  get tool(): DeepZoomTools {
    return this._tool;
  }

  ngOnInit() {
    this.createMap();
  }


  updateLayers(): void {
    this.layerControls.forEach(l => l.nativeLayer.getPane().style.display = l.visible ? "block" : "none");
    this.layerControls.filter(l => l.visible).forEach(l => l.update());
  }

  resetCamera(options: object = {}): void {
    let viewport = this.item.options.viewport;
    this.map.setView(this.pointToLatLng(viewport.width / 2, viewport.height / 2, 0), this.map.getMinZoom());
  }

  private createMap(): void {


    this.map = L.map(this.mapContainer.nativeElement, {
      center: [0, 0],
      zoom: 0,
      crs: L.CRS.Simple,
      zoomControl: false
    });

    // Create the layers
    this.createLayers();
    this.updateLayers();

    // Set the minimum zoom
    let bounds = [
      this.pointToLatLng(0, 0, 0),
      this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
    ];

    this.map.setMinZoom(this.map.getBoundsZoom(bounds));

    // Reset the camera
    this.resetCamera();

    // Set tool 
    this.tool = this._tool;

    // Setup the measure tool


  }


  private createLayers(): void {

    this.layerControls = [];
    let i = 0;

    for (let layerSpec of this.item.layers) {
      let layerControls: LeafletLayerControls = null;
      let pane = `dz-pane-${i++}`;

      this.map.createPane(pane);

      if (layerSpec.type === "deep-image") {
        layerControls = this.createDeepImageLayer(layerSpec, pane);
      } else if (layerSpec.type === "vector") {
        layerControls = this.createVectorLayer(layerSpec, pane);
      }

      if (layerControls) {
        this.map.addLayer(layerControls.nativeLayer);
        this.layerControls.push(layerControls);
      }


    }


  }


  private createDeepImageLayer(layerSpec: DeepZoomItemDeepImageLayer, pane: string): LeafletLayerControls {

    let nativeLayer = new LeafletDeepImageLayer({
      keepBuffer: 10,
      pane: pane,
      bounds: [
        this.pointToLatLng(0, 0, 0),
        this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
      ],
      cnTileSize: layerSpec.tileSize,
      cnViewportWidth: this.item.options.viewport.width,
      cnViewportHeight: this.item.options.viewport.height,
      cnWidth: layerSpec.width,
      cnHeight: layerSpec.height,
      cnTileOverlap: layerSpec.tileOverlap,
      cnImageSrc: this.context.resolveUrl(layerSpec.imageSrc, this.item),
    });

    return {
      title: layerSpec.title,
      opacity: layerSpec.opacity,
      visible: layerSpec.visible,
      exclusive: layerSpec.exclusive,
      previewImage: layerSpec.previewImage,
      nativeLayer: nativeLayer,
      update: function () { this.nativeLayer.setOpacity(this.opacity); }
    };

  }

  private pointToLatLng(x: number, y: number, z: number): any {
    return this.map.options.crs.pointToLatLng(L.point(x, y), z);
  }

  private createVectorLayer(layerSpec: DeepZoomItemVectorLayer, pane: string): LeafletLayerControls {
    let nativeLayer = L.layerGroup([], { pane: pane });

    for (let s of layerSpec.shapes) {
      let shape = null;

      if (s.type === "polygon") {
        shape = L.polygon(s.points.map(p => this.pointToLatLng(p[0], p[1], 0)), { pane: pane });

      } else if (s.type === "circle") {
        shape = L.circle(this.pointToLatLng(s.center[0], s.center[1], 0), { radius: s.radius, pane: pane });
      }


      if (shape) {

        if (s.title) {
          shape.bindTooltip(s.title);
        }

        if (s.href) {
          shape.on("click", () => {
            let url = this.context.joinUrl("/", this.context.resolveUrl(s.href, this.item));
            this.router.navigateByUrl(url);
          });
        }

        shape.setStyle({
          fill: s.drawAttributes.fill,
          fillColor: s.drawAttributes.fillColor || "#fff",
          stroke: s.drawAttributes.stroke,
          color: s.drawAttributes.strokeColor || "#000"
        });
        nativeLayer.addLayer(shape);
      }
    }

    return {
      title: layerSpec.title,
      exclusive: layerSpec.exclusive,
      opacity: layerSpec.opacity,
      visible: layerSpec.visible,
      previewImage: layerSpec.previewImage,
      nativeLayer: nativeLayer,
      update: function () {
        this.nativeLayer.eachLayer(l => {
          l.setStyle({
            opacity: this.opacity,
            fillOpacity: this.opacity
          });
        })
      }
    }

  }

}