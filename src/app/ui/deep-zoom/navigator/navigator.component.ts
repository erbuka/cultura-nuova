import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { DeepZoomItem } from 'src/app/types/deep-zoom-item';

export type NavigatorTrackBounds = {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

@Component({
  selector: 'app-navigator',
  templateUrl: './navigator.component.html',
  styleUrls: ['./navigator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigatorComponent implements OnInit {

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

}
