import * as L from 'leaflet';
import { Location } from '@angular/common';

export const LeafletDeepImageLayer = L.GridLayer.extend({

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

    let tile = L.DomUtil.create("div", "leaflet-tile");
    let canvas = L.DomUtil.create("canvas");
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