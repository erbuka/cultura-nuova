import { Component, OnInit, Input, ViewChild, ElementRef, OnDestroy } from '@angular/core';
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
export class ThreeDeepZoomComponent implements OnInit, OnDestroy {


  @Input() item: DeepZoomItem = null;
  @ViewChild("mapContainer", { static: true }) mapContainer: ElementRef;

  layerControls: ThreeLayerControls[] = null;
  deepZoom: tdz.DeepZoom = null;

  constructor(private context: ContextService) { }

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

    return {
      title: layerSpec.title,
      opacity: typeof layerSpec.opacity === "number" ? layerSpec.opacity : DeepZoomLayerControlsDefaults.opacity,
      visible: typeof layerSpec.visible === "boolean" ? layerSpec.visible : DeepZoomLayerControlsDefaults.visible,
      previewImage: layerSpec.previewImage || DeepZoomLayerControlsDefaults.previewImage,
      color: layerSpec.color || DeepZoomLayerControlsDefaults.color,
      nativeLayer: new tdz.DeepImageLayer({
        color: layerSpec.color || DeepZoomLayerControlsDefaults.color,
        tileSize: layerSpec.tileSize,
        tileOverlap: layerSpec.tileOverlap,
        width: layerSpec.width,
        height: layerSpec.height,
        viewportWidth: this.item.options.viewport.width,
        viewportHeight: this.item.options.viewport.height,
        minZoom: layerSpec.minZoom,
        maxZoom: layerSpec.maxZoom,
        getTileURL: (zoom, x, y) => {
          return this.context.joinUrl(baseUrl, `${zoomLevelsCount - 1 + (zoom - layerSpec.maxZoom) }/${x}_${y}.jpg`);
        }
      })
    }
  }

}
