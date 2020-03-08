import { Component, OnInit, Input, ViewChild, ElementRef, OnDestroy, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DeepZoomItem, DeepZoomItemDeepImageLayer } from 'src/app/types/deep-zoom-item';
import { DeepZoomLayerControls, DeepZoomLayerControlsDefaults } from '../deep-zoom';
import { ContextService } from 'src/app/context.service';
import * as cdz from './canvas-deep-zoom';
import { NavigatorTrackBounds } from '../navigator/navigator.component';


interface CanvasLayerControls extends DeepZoomLayerControls {
  nativeLayer: cdz.Layer;
}

@Component({
  selector: 'app-canvas-deep-zoom',
  templateUrl: './canvas-deep-zoom.component.html',
  styleUrls: ['./canvas-deep-zoom.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CanvasDeepZoomComponent implements OnInit, OnDestroy {


  @Input() item: DeepZoomItem = null;
  @ViewChild("mapContainer", { static: true }) mapContainer: ElementRef;

  deepZoom: cdz.DeepZoom = null;
  layerControls: CanvasLayerControls[] = null;
  navigatorBounds: NavigatorTrackBounds = null;

  constructor(private context: ContextService, private cdRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.createDeepZoom();
  }

  private createDeepZoom() {
    this.deepZoom = new cdz.DeepZoom(this.mapContainer.nativeElement, { debugMode: false });

    this.deepZoom.events.on("zoom", () => {
      this.updateNavigatorBounds();
    });

    this.deepZoom.events.on("pan", () => {
      this.updateNavigatorBounds();
    });

    this.createLayers();
    this.updateLayers();
    this.updateNavigatorBounds();
  }


  private createLayers(): void {

    this.layerControls = [];

    for (let layerSpec of this.item.layers) {
      if (layerSpec.type === "deep-image") {
        this.layerControls.push(this.createDeepImageLayer(layerSpec));
      } else if (layerSpec.type === "vector") {
      }
    }

    this.layerControls.reverse().forEach(l => this.deepZoom.addLayer(l.nativeLayer));

  }

  updateNavigatorBounds(): void {
    this.navigatorBounds = {
      top: this.deepZoom.projection.top,
      left: this.deepZoom.projection.left,
      bottom: this.deepZoom.projection.bottom,
      right: this.deepZoom.projection.right
    }
    this.cdRef.markForCheck();
  }

  toggleLayerVisibility(l: CanvasLayerControls): void {
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
    this.layerControls.forEach(c => {
      c.nativeLayer.options.visible = c.visible;
      c.nativeLayer.options.opacity = c.opacity;
    });
    this.cdRef.markForCheck();
  }

  ngOnDestroy(): void {
    this.deepZoom.dispose();
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
        return this.context.joinUrl(baseUrl, `${zoomLevelsCount - 1 + (zoom - layerSpec.maxZoom)}/${x}_${y}.${layerSpec.imageFormat}`);
      }
    });

    return result;

  }

}
