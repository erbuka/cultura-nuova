import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import * as L from 'leaflet';
import { DeepZoomItem, DeepZoomItemDeepImageLayer, DeepZoomItemVectorLayer } from 'src/app/types/deep-zoom-item';
import { DeepZoomLayerControls, DeepZoomTools, DeepZoomMeasureUnit, DeepZoomLayerControlsDefaults, measure } from '../deep-zoom';
import { Router } from '@angular/router';
import { LeafletDeepImageLayer } from './leaflet-deep-image-layer';
import { LeafletMeasureLayer } from './leaflet-measure-layer';
import { NavigatorTrackBounds, NavigatorPanEvent } from '../navigator/navigator.component';


const MEASURE_LAYER_PANE = "dz-measure-pane";


interface LeafletLayerControls extends DeepZoomLayerControls {
  nativeLayer: L.Layer;
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
  measureLayer: LeafletMeasureLayer = null;
  navigatorBounds: NavigatorTrackBounds = null;
  _tool: DeepZoomTools = "pan";
  _measureUnit: DeepZoomMeasureUnit = "centimeters";

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
        if (!this.map.hasLayer(this.measureLayer))
          this.map.addLayer(this.measureLayer);
        break;
      case "pan":
        this.map.dragging.enable();
        this.map.removeLayer(this.measureLayer);
        break;
    }

  }

  get tool(): DeepZoomTools {
    return this._tool;
  }

  get formattedZoom(): string {
    return ((100 * Math.pow(2, this.map.getZoom())).toFixed(0) + "%");
  }

  ngOnInit() {
    this.createMap();
  }

  updateNavigatorBounds(): void {
    let bounds = this.map.getBounds();
    let worldBounds = L.bounds(this.latLngToPoint(bounds.getNorthEast(), 0), this.latLngToPoint(bounds.getSouthWest(), 0));

    this.navigatorBounds = {
      left: worldBounds.min.x,
      top: worldBounds.min.y,
      right: worldBounds.max.x,
      bottom: worldBounds.max.y,
    };
  }

  toggleLayerVisibility(l: LeafletLayerControls): void {
    let visible = !l.visible;

    if (visible && this.item.layerGroups) {
      this.item.layerGroups.filter(g => g.exclusive && g.layers.includes(l.name)).forEach(g => {
        this.layerControls.filter(l2 => g.layers.includes(l2.name)).forEach(l2 => l2.visible = false);
      })
    }

    l.visible = visible;
    this.updateLayers();
  }


  updateLayers(): void {
    let zoom = this.map.getZoom();
    this.layerControls.forEach(l => {

      if (l.maxZoom >= zoom && l.minZoom <= zoom) {
        l.nativeLayer.getPane().style.display = l.visible ? "block" : "none"
      } else {
        l.nativeLayer.getPane().style.display = "none";
      }

    });

    this.layerControls.filter(l => l.visible).reverse().forEach((l, i) => {
      l.nativeLayer.getPane().style.zIndex = i + "";
      l.update();
    })
  }

  resetCamera(options: object = {}): void {
    let viewport = this.item.options.viewport;
    this.map.setView(this.pointToLatLng(viewport.width / 2, viewport.height / 2, 0), this.map.getMinZoom());
  }


  onNavigatorPan(evt: NavigatorPanEvent): void {
    this.map.panTo(this.pointToLatLng(evt.x, evt.y, 0), { animate: false });
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
      zoomDelta: 0.1
    });

    // Setup map listeners 
    this.map.on("move", () => {
      this.updateNavigatorBounds();
    });

    this.map.on("zoom", () => {
      this.updateNavigatorBounds();
      this.updateLayers();
    });

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

    this.item.layers.forEach(layerSpec => {

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
    });

    // Measure layer
    {
      this.measureLayer = new LeafletMeasureLayer({
        pane: MEASURE_LAYER_PANE,
        measure: (p0, p1) => {
          let distance = this.map.options.crs.distance(p0, p1);
          return measure(distance, this.measureUnit, this.item.options.viewport.dpi).toFixed(2);
        }
      });
      this.map.createPane(MEASURE_LAYER_PANE).style.zIndex = this.layerControls.length + "";
    }

  }



  private pointToLatLng(x: number, y: number, z: number): L.LatLng {
    return this.map.options.crs.pointToLatLng(L.point(x, y), z);
  }

  private latLngToPoint(latlng: L.LatLng, zoom: number): L.Point {
    return this.map.options.crs.latLngToPoint(latlng, zoom);
  }

  private createDeepImageLayer(layerSpec: DeepZoomItemDeepImageLayer, pane: string): LeafletLayerControls {

    let result = this.context.assign({}, DeepZoomLayerControlsDefaults, {
      name: layerSpec.name,
      title: layerSpec.title,
      opacity: layerSpec.opacity,
      opacityControl: layerSpec.opacityControl,
      visible: layerSpec.visible,
      minZoom: layerSpec.minZoom,
      maxZoom: layerSpec.maxZoom,
      previewImage: layerSpec.previewImage,
      color: layerSpec.color,
      nativeLayer: null,
      update: function () { this.nativeLayer.setOpacity(this.opacity); }
    })

    result.nativeLayer = new LeafletDeepImageLayer({
      pane: pane,
      bounds: L.latLngBounds(
        this.pointToLatLng(0, 0, 0),
        this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
      ),
      minZoom: result.minZoom,
      maxZoom: result.maxZoom,
      cnTileSize: layerSpec.tileSize,
      cnViewportWidth: this.item.options.viewport.width,
      cnViewportHeight: this.item.options.viewport.height,
      cnWidth: layerSpec.width,
      cnHeight: layerSpec.height,
      cnTileOverlap: layerSpec.tileOverlap,
      cnImageSrc: this.context.resolveUrl(layerSpec.imageSrc, this.item),
      cnImageFormat: layerSpec.imageFormat
    });

    return result;
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
          shape.bindTooltip(s.title, { pane: pane });
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

    return this.context.assign({}, DeepZoomLayerControlsDefaults, {
      name: layerSpec.name,
      title: layerSpec.title,
      opacity: layerSpec.opacity,
      opacityControl: layerSpec.opacityControl,
      visible: layerSpec.visible,
      minZoom: layerSpec.minZoom,
      maxZoom: layerSpec.maxZoom,
      previewImage: layerSpec.previewImage,
      color: layerSpec.color,
      nativeLayer: nativeLayer,
      update: function () { this.nativeLayer.getPane().style.opacity = this.opacity + ""; }
    })


  }

}