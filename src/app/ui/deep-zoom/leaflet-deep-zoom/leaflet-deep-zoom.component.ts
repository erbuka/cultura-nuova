import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import * as L from 'leaflet';
import { DeepZoomItem, DeepZoomItemDeepImageLayer, DeepZoomItemVectorLayer } from 'src/app/types/deep-zoom-item';
import { DeepZoomLayerControls, DeepZoomTools, DeepZoomMeasureUnit, DeepZoomLayerControlsDefaults } from '../deep-zoom';
import { Router } from '@angular/router';
import { LeafletDeepImageLayer } from './leaflet-deep-image-layer';



interface LeafletLayerControls extends DeepZoomLayerControls {
  title: string;
  opacity: number;
  visible: boolean;
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

  map: L.Map = null;
  layerControls: LeafletLayerControls[] = null;
  minimapTrackStyle: object = {};
  _tool: DeepZoomTools = "pan";
  _measureUnit: DeepZoomMeasureUnit = "pixels";

  constructor(private context: ContextService, private router: Router) { }


  get viewportAspectRatio(): number {
    return this.item.options.viewport.width / this.item.options.viewport.height;
  }

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

  updateMinimapTrackStyle() {
    let bounds = this.map.getBounds();
    let a = L.bounds(this.latLngToPoint(bounds.getNorthEast(), 0), this.latLngToPoint(bounds.getSouthWest(), 0));
    let b = L.bounds([0, 0], [this.item.options.viewport.width, this.item.options.viewport.height]);

    let minX = Math.max(a.min.x, b.min.x);
    let maxX = Math.min(a.max.x, b.max.x);
    let minY = Math.max(a.min.y, b.min.y);
    let maxY = Math.min(a.max.y, b.max.y);

    if (maxX > minX && maxY > minY) { // Intersezione non nulla
      let left = minX / b.max.x * 100 + "%"
      let top = minY / b.max.y * 100 + "%"
      let width = (maxX - minX) / b.max.x * 100 + "%";
      let height = (maxY - minY) / b.max.y * 100 + "%";

      this.minimapTrackStyle = {
        left: left,
        top: top,
        width: width,
        height: height
      }

    }

  }

  private createMap(): void {


    this.map = L.map(this.mapContainer.nativeElement, {
      center: [0, 0],
      zoom: 0,
      crs: L.CRS.Simple,
      renderer: L.svg({ padding: 1 }),
      zoomControl: false,
      zoomAnimation: true,
      zoomSnap: 0,
    });

    // Setup map listeners 
    this.map.on("move", this.updateMinimapTrackStyle.bind(this));
    this.map.on("zoomend", this.updateMinimapTrackStyle.bind(this));

    // Create the layers
    this.createLayers();
    this.updateLayers();

    // Set the minimum zoom
    let bounds = L.latLngBounds(
      this.pointToLatLng(0, 0, 0),
      this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
    );

    this.map.setMinZoom(this.map.getBoundsZoom(bounds));

    // Reset the camera
    this.resetCamera();

    // Set tool 
    this.tool = this._tool;

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
      pane: pane,
      bounds: L.latLngBounds(
        this.pointToLatLng(0, 0, 0),
        this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
      ),
      minZoom: layerSpec.minZoom,
      maxZoom: layerSpec.maxZoom,
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
      opacity: typeof layerSpec.opacity === "number" ? layerSpec.opacity : DeepZoomLayerControlsDefaults.opacity,
      visible: typeof layerSpec.visible === "boolean" ? layerSpec.visible : DeepZoomLayerControlsDefaults.visible,
      previewImage: layerSpec.previewImage || DeepZoomLayerControlsDefaults.previewImage,
      color: layerSpec.color || DeepZoomLayerControlsDefaults.color,
      nativeLayer: nativeLayer,
      update: function () { this.nativeLayer.setOpacity(this.opacity); }
    };

  }

  private pointToLatLng(x: number, y: number, z: number): L.LatLng {
    return this.map.options.crs.pointToLatLng(L.point(x, y), z);
  }

  private latLngToPoint(latlng: L.LatLng, zoom: number): L.Point {
    return this.map.options.crs.latLngToPoint(latlng, zoom);
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
      opacity: typeof layerSpec.opacity === "number" ? layerSpec.opacity : DeepZoomLayerControlsDefaults.opacity,
      visible: typeof layerSpec.visible === "boolean" ? layerSpec.visible : DeepZoomLayerControlsDefaults.visible,
      previewImage: layerSpec.previewImage || DeepZoomLayerControlsDefaults.previewImage,
      color: layerSpec.color || DeepZoomLayerControlsDefaults.color,
      nativeLayer: nativeLayer,
      update: function () {
        this.nativeLayer.eachLayer(l => {
          l.setStyle({
            opacity: this.opacity,
            fillOpacity: this.opacity
          });
        })
      }
    };

  }

}