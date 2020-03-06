import { Component, OnInit, Input, ViewChild, ElementRef, OnDestroy, OnChanges } from '@angular/core';
import { DeepZoomItem, DeepZoomItemDeepImageLayer } from 'src/app/types/deep-zoom-item';
import { DeepZoomLayerControls, DeepZoomLayerControlsDefaults } from '../deep-zoom';
import { ContextService } from 'src/app/context.service';
import * as cdz from './canvas-deep-zoom';


interface CanvasLayerControls extends DeepZoomLayerControls {
  nativeLayer: cdz.Layer;
}

@Component({
  selector: 'app-canvas-deep-zoom',
  templateUrl: './canvas-deep-zoom.component.html',
  styleUrls: ['./canvas-deep-zoom.component.scss']
})
export class CanvasDeepZoomComponent implements OnInit, OnDestroy {


  @Input() item: DeepZoomItem = null;
  @ViewChild("mapContainer", { static: true }) mapContainer: ElementRef;

  deepZoom: cdz.DeepZoom = null;
  layerControls: CanvasLayerControls[] = null;

  constructor(private context: ContextService) { }

  ngOnInit(): void {
    this.deepZoom = new cdz.DeepZoom(this.mapContainer.nativeElement);
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

    this.layerControls.forEach(l => this.deepZoom.addLayer(l.nativeLayer));

  }

  updateLayers(): void {
    this.layerControls.forEach(c => {
      c.nativeLayer.options.visible = c.visible;
      c.nativeLayer.options.opacity = c.opacity;
    })
  }

  ngOnDestroy(): void {
  }

  createDeepImageLayer(layerSpec: DeepZoomItemDeepImageLayer): CanvasLayerControls {

    let baseUrl = this.context.resolveUrl(layerSpec.imageSrc, this.item);
    let zoomLevelsCount = layerSpec.maxZoom - layerSpec.minZoom + 1;

    let result = this.context.assign({}, DeepZoomLayerControlsDefaults, {
      name: layerSpec.name,
      title: layerSpec.title,
      opacity: layerSpec.opacity,
      opacityControl: layerSpec.opacityControl,
      visible: layerSpec.visible,
      previewImage: layerSpec.previewImage,
      color: layerSpec.color,
      nativeLayer: null
    });

    result.nativeLayer = new cdz.DeepImageLayer({
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
    });

    return result;

  }

}
