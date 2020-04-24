import { ItemBase, LocalizedText } from './item';

export interface SlideshowItem extends ItemBase {
  type: "slideshow",
  options: {
    itemWidth: string,
    itemAspectRatio: number
  },
  groups: string[],
  slides: {
    group: string,
    previewImage: string,
    image?: string,
    title?: LocalizedText,
    href?: string,
    video?: string,
  }[]
}