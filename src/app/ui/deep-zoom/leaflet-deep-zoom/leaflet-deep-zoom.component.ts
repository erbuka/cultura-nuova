import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import * as L from 'leaflet';
import { Location } from '@angular/common';
import { DeepZoomLayerControls, DeepZoomItem, DeepZoomItemDeepImageLayer, DeepZoomItemVectorLayer } from 'src/app/types/deep-zoom-item';





const DeepImageLayer = L.GridLayer.extend({

  zoomLevels: null,
  zoomLevelCount: null,

  initialize: function (options) {

    let scaleX = options.cnViewportWidth / options.cnWidth;
    let scaleY = options.cnViewportHeight / options.cnHeight;

    options.tileSize = L.point(options.cnTileSize * scaleX, options.cnTileSize * scaleY);
    options.minZoom = -Math.ceil(Math.log2(Math.max(options.cnWidth, options.cnHeight)));
    options.maxZoom = 0;

    L.GridLayer.prototype.initialize.call(this, options);


    this.zoomLevelCount = options.maxZoom - options.minZoom + 1;

    this.zoomLevels = [];

    let w = options.cnWidth, h = options.cnHeight;

    for (let z = options.maxZoom; z >= options.minZoom; z--) {
      this.zoomLevels[z] = {
        zoom: z,
        width: w,
        height: h,
        tilesX: Math.ceil(w / options.cnTileSize),
        tilesY: Math.ceil(h / options.cnTileSize),
      };

      w = Math.ceil(w / 2);
      h = Math.ceil(h / 2);
    }


  },
  createTile: function (coords, done) {
    let z = coords.z;
    let level = this.zoomLevels[z];
    let overlap = this.options.cnTileOverlap;

    let tileSize = this.getTileSize();

    let tile: HTMLElement = L.DomUtil.create("div", "leaflet-tile");
    let canvas: HTMLCanvasElement = L.DomUtil.create("canvas");
    let ctx = canvas.getContext("2d");

    canvas.width = Math.ceil(tileSize.x);
    canvas.height = Math.ceil(tileSize.y);

    tile.style.overflow = "hidden";
    tile.appendChild(canvas);

    let img = new Image();

    img.addEventListener("load", () => {

      let sx = coords.x === 0 ? 0 : overlap;
      let sy = coords.y === 0 ? 0 : overlap;
      let sw = coords.x === level.tilesX - 1 ? img.width - sx : img.width - sx - overlap;
      let sh = coords.y === level.tilesY - 1 ? img.height - sy : img.height - sy - overlap;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw / this.options.cnTileSize * canvas.width, sh / this.options.cnTileSize * canvas.height);

      ctx.fillStyle = "#000";
      ctx.font = "12px Arial";
      ctx.fillText(`(${coords.x}, ${coords.y}, ${coords.z})`, 0, 20);

      done(null, tile);
    })

    img.src = Location.joinWithSlash(this.options.cnImageSrc, `${this.zoomLevelCount - 1 + z}/${coords.x}_${coords.y}.jpg`);

    return tile;
  }
});

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

  constructor(private context: ContextService) { }

  ngOnInit() {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [0, 0],
      zoom: 0,
      crs: L.CRS.Simple,
      zoomControl: false
    });

    this.map.on("click", (evt) => console.log(evt.latlng));

    this.createLayers();
  }


  updateLayers(): void {
    this.layerControls.forEach(l => l.nativeLayer.getPane().style.display = l.visible ? "block" : "none");
    this.layerControls.filter(l => l.visible).forEach(l => l.update());
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
    this.updateLayers();


  }


  private createDeepImageLayer(layerSpec: DeepZoomItemDeepImageLayer, pane: string): LeafletLayerControls {
    let nativeLayer = new DeepImageLayer({
      keepBuffer: 10,
      pane: pane,
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

  private createVectorLayer(layerSpec: DeepZoomItemVectorLayer, pane: string): LeafletLayerControls {
    let nativeLayer = L.layerGroup([], { pane: pane });
    let crs = this.map.options.crs;

    for (let s of layerSpec.shapes) {
      let shape = null;

      if (s.type === "polygon") {
        shape = L.polygon(s.points.map(p => crs.pointToLatLng(L.point(p[0], p[1]), 0)), { pane: pane });

      } else if (s.type === "circle") {
        shape = L.circle(crs.pointToLatLng(L.point(s.center[0], s.center[1]), 0), { radius: s.radius, pane: pane });
      }


      if (shape) {

        if (s.title) {
          shape.bindTooltip(s.title);
        }

        shape.setStyle({
          fill: s.drawAttributes.fill,
          fillColor: s.drawAttributes.fillColor,
          stroke: s.drawAttributes.stroke,
          color: s.drawAttributes.strokeColor
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