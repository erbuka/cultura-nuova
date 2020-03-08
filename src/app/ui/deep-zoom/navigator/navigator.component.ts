import { Component, OnInit, Input, ChangeDetectionStrategy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { DeepZoomItem } from 'src/app/types/deep-zoom-item';

export type NavigatorTrackBounds = {
  top: number,
  left: number,
  bottom: number,
  right: number,
}

export type NavigatorPanEvent = {
  x: number,
  y: number
}

@Component({
  selector: 'app-navigator',
  templateUrl: './navigator.component.html',
  styleUrls: ['./navigator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigatorComponent implements OnInit {


  @ViewChild("minimap", { read: ElementRef }) minimap: ElementRef;

  @Output() navigatorPan: EventEmitter<NavigatorPanEvent> = new EventEmitter();

  @Input() item: DeepZoomItem;
  @Input() bounds: NavigatorTrackBounds = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  };

  constructor() { }

  ngOnInit(): void { }

  get viewportAspectRatio(): number {
    return this.item.options.viewport.width / this.item.options.viewport.height;
  }

  get navigatorStyle(): object {
    let viewport = this.item.options.viewport;
    return {
      left: `${this.bounds.left / viewport.width * 100}%`,
      width: `${(this.bounds.right - this.bounds.left) / viewport.width * 100}%`,
      top: `${this.bounds.top / viewport.height * 100}%`,
      height: `${(this.bounds.bottom - this.bounds.top) / viewport.height * 100}%`
    }
  }

  onPan(evt: Event & { center: { x: number, y: number } }): void {
    let bounds = this.minimap.nativeElement.getBoundingClientRect();
    let viewport = this.item.options.viewport;

    let posX = (evt.center.x - bounds.x) / bounds.width * viewport.width;
    let posY = (evt.center.y - bounds.y) / bounds.height * viewport.height;

    this.navigatorPan.emit({
      x: Math.round(posX),
      y: Math.round(posY)
    });

  }

}
