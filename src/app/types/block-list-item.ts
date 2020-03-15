import { ItemBase, LocalizedText } from './item';

export interface BlockListItem extends ItemBase {
    type: "block-list";
    options: {
        itemWidth: string,
        itemAspectRatio: number
    },
    links: { href: string, title: LocalizedText, image: string }[]
}