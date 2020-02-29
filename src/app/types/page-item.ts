import { ItemBase } from './item';

export interface PageItem extends ItemBase {
    type: "page";
    template: string;
    data?: any;
}
