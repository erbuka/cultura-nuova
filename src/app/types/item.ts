import { PageItem } from './page-item';
import { DeepZoomItem } from './deep-zoom-item';
import { BlockListItem } from './block-list-item';
import { SlideshowItem } from './slideshow-item';

export interface ItemBase {
  type: string;
  url?: string;
}

export type Item = PageItem | DeepZoomItem | BlockListItem | SlideshowItem;