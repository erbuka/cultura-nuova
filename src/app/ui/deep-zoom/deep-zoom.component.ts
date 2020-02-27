import { Component, OnInit, Input, ViewChild, ElementRef, Inject } from '@angular/core';
import { Item, ContextService } from 'src/app/context.service';
import * as Leaflet from 'leaflet';
import { Location } from '@angular/common';
import { core } from '@angular/compiler';


export interface DeepZoomItem extends Item {
  options: {
    viewport: {
      width: number,
      height: number
    }
  },
  layers: {
    type: "deep-image",
    imageSrc: string,
    width: number,
    height: number,
    tileSize: number,
    tileOverlap: number,
  }[]
}

interface DeepImageLayerOptions extends Leaflet.GridLayerOptions {
  cnTileOverlap: number;
  cnImageSrc: string;
  cnWidth: number;
  cnHeight: number;
}


class DeepImageLayer extends Leaflet.GridLayer {

  private zoomLevels: {
    zoom: number;
    width: number;
    height: number;
    tilesX: number;
    tilesY: number;
  }[] = null;


  constructor(private cnOptions: DeepImageLayerOptions) {
    super(cnOptions);

    this.zoomLevels = [];

    let w = cnOptions.cnWidth, h = cnOptions.cnHeight;

    for (let z = cnOptions.maxZoom; z >= cnOptions.minZoom; z--) {
      this.zoomLevels[z] = {
        zoom: z,
        width: w,
        height: h,
        tilesX: Math.ceil(w / this.getTileSize().x),
        tilesY: Math.ceil(h / this.getTileSize().y),
      };

      w = Math.ceil(w / 2);
      h = Math.ceil(h / 2);
    }


  }

  createTile(coords: Leaflet.Coords, done: Leaflet.DoneCallback): HTMLElement {

    let z = coords.z;
    let level = this.zoomLevels[z];
    let overlap = this.cnOptions.cnTileOverlap;

    let tile = <any>Leaflet.DomUtil.create("div", "leaflet-tile");
    let canvas = <HTMLCanvasElement>Leaflet.DomUtil.create("canvas");
    let ctx = canvas.getContext("2d");

    let tileSize = this.getTileSize();

    tile.width = tileSize.x;
    tile.height = tileSize.y;
    tile.appendChild(canvas);

    let img = new Image();

    img.addEventListener("load", () => {

      canvas.width = img.width - (coords.x === 0 || coords.x === level.tilesX - 1 ? overlap : 2 * overlap);
      canvas.height = img.height - (coords.y === 0 || coords.y === level.tilesY - 1 ? overlap : 2 * overlap);

      ctx.drawImage(img, 1, 1, img.width, img.height, 0, 0, img.width, img.height);

      done(null, tile);
    })

    img.src = Location.joinWithSlash(this.cnOptions.cnImageSrc, `${z}/${coords.x}_${coords.y}.jpg`);

    return tile;

  }

}

@Component({
  selector: 'app-deep-zoom',
  templateUrl: './deep-zoom.component.html',
  styleUrls: ['./deep-zoom.component.scss']
})
export class DeepZoomComponent implements OnInit {

  @ViewChild("mapContainer", { static: true }) mapContainer: ElementRef;

  @Input() item: DeepZoomItem = null;

  map: Leaflet.Map = null;

  constructor(private context: ContextService) { }

  ngOnInit() {
    this.map = Leaflet.map(this.mapContainer.nativeElement, {
      center: [0, 0],
      zoom: 8,
      crs: Leaflet.CRS.Simple,
    });

    //this.map.on("click", (evt) => console.log(evt.latlng));

    this.createLayers();
  }


  private createLayers(): void {
    for (let layerSpec of this.item.layers) {
      let layer: Leaflet.Layer = null;
      if (layerSpec.type === "deep-image") {

        let minZoom = 0;
        let maxZoom = Math.ceil(Math.log2(Math.max(layerSpec.width, layerSpec.height)));

        layer = new DeepImageLayer({
          minZoom: minZoom,
          maxZoom: maxZoom,
          tileSize: layerSpec.tileSize,
          keepBuffer: 10,
          cnWidth: layerSpec.width,
          cnHeight: layerSpec.height,
          cnTileOverlap: layerSpec.tileOverlap,
          cnImageSrc: this.context.resolveUrl(layerSpec.imageSrc, this.item),
        });
      }

      this.map.addLayer(layer);

    }
  }

}
