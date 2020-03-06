import { Component, OnInit, Input, ViewChild, ElementRef, OnDestroy, OnChanges } from '@angular/core';
import { DeepZoomItem, DeepZoomItemDeepImageLayer } from 'src/app/types/deep-zoom-item';
import * as tdz from './three-deep-zoom';
import { DeepZoomLayerControls, DeepZoomLayerControlsDefaults } from '../deep-zoom';
import { ContextService } from 'src/app/context.service';



interface ThreeLayerControls extends DeepZoomLayerControls {
  nativeLayer: tdz.Layer;
}

@Component({
  selector: 'app-three-deep-zoom',
  templateUrl: './three-deep-zoom.component.html',
  styleUrls: ['./three-deep-zoom.component.scss']
})
export class ThreeDeepZoomComponent implements OnInit, OnDestroy, OnChanges {


  @Input() item: DeepZoomItem = null;
  @ViewChild("mapContainer", { static: true }) mapContainer: ElementRef;

  layerControls: ThreeLayerControls[] = null;
  deepZoom: tdz.DeepZoom = null;

  constructor(private context: ContextService) { }

  ngOnChanges() {
    console.log("changes");
  }

  ngOnInit(): void {
    this.deepZoom = new tdz.DeepZoom(this.mapContainer.nativeElement);
    this.createLayers();
    this.updateLayers();
  }

  private createLayers(): void {

    this.layerControls = [];

    for (let layerSpec of this.item.layers) {
      if (layerSpec.type === "deep-image") {
        this.layerControls.push(this.createDeepImageLayer(layerSpec));
      } else if (layerSpec.type === "vector") {
      }
    }

    for (let c of this.layerControls) {
      this.deepZoom.addLayer(c.nativeLayer);
    }

  }

  updateLayers(): void {
    this.layerControls.forEach(c => {
      c.nativeLayer.options.visible = c.visible;
      c.nativeLayer.options.opacity = c.opacity;
    })
  }

  ngOnDestroy(): void {
    this.deepZoom.dispose();
  }

  createDeepImageLayer(layerSpec: DeepZoomItemDeepImageLayer): ThreeLayerControls {

    let baseUrl = this.context.resolveUrl(layerSpec.imageSrc, this.item);
    let zoomLevelsCount = layerSpec.maxZoom - layerSpec.minZoom + 1;

    return this.context.assign({}, DeepZoomLayerControlsDefaults, {
      name: layerSpec.name,
      title: layerSpec.title,
      opacity: layerSpec.opacity,
      opacityControl:layerSpec.opacityControl,
      visible: layerSpec.visible,
      previewImage: layerSpec.previewImage,
      color: layerSpec.color,
      nativeLayer: new tdz.DeepImageLayer({
        color: layerSpec.color,
        tileSize: layerSpec.tileSize,
        tileOverlap: layerSpec.tileOverlap,
        width: layerSpec.width,
        height: layerSpec.height,
        viewportWidth: this.item.options.viewport.width,
        viewportHeight: this.item.options.viewport.height,
        minZoom: layerSpec.minZoom,
        maxZoom: layerSpec.maxZoom,
        getTileURL: (zoom, x, y) => {
          return this.context.joinUrl(baseUrl, `${zoomLevelsCount - 1 + (zoom - layerSpec.maxZoom)}/${x}_${y}.jpg`);
        }
      })
    })

  }

}
