import { Injectable, TemplateRef, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Location } from '@angular/common';

import * as PAGE_SCHEMA from '../schema/page.schema.json';


export interface Config {
  backgroundImage: string;
  entry: string;
}

export interface Item {
  url: string;
  type: string;
  [k: string]: any;
}

export interface BlockListItem extends Item {
  options: {},
  links: { link: string, image: string }[]
}


export interface PageItem extends Item {
  template: string;
  data: any;
}

export interface SlideshowItem extends Item {
  options: {},
  groups: string[],
  slides: {
    group: string,
    title: string,
    image: string,
    href: string
  }[]
}

export type Error = {
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  templates: Map<string, TemplateRef<any>> = new Map();

  onError: EventEmitter<Error> = new EventEmitter();


  constructor(private httpClient: HttpClient, private location: Location) { }

  getConfig(): Observable<Config> {
    return this.httpClient.get<any>("/assets/config.json");
  }

  getItem(url: string, handleError: boolean = true): Observable<Item> {

    let obs = this.httpClient.get<any>(this.joinUrl(url, "item.json"), { responseType: "json" });

    if (handleError) {
      obs = obs.pipe(tap(x => x, e => {
        this.raiseError({ description: e.message })
      }));
    }


    obs = obs.pipe(
      map(x => {
        x.url = url;
        return <Item>x;
      })
    );

    return obs;
  }

  getTemplate(name: string): TemplateRef<any> {
    return this.templates.get(name);
  }

  registerTemplate(name: string, ref: TemplateRef<any>) {
    this.templates.set(name, ref);
  }

  resolveUrl(itemUrl: string, item: Item) {
    if (itemUrl.startsWith("/") || itemUrl.startsWith("http://") || itemUrl.startsWith("https://")) {
      return itemUrl;
    } else {

      let pieces = item.url.split("/").filter(v => v.trim().length > 0);

      for (let p of itemUrl.split("/").filter(v => v.trim().length > 0)) {
        switch (p) {
          case "..":
            pieces.pop();
            break;
          case ".":
            break;
          default:
            pieces.push(p);

        }
      }

      return this.joinUrl("/", ...pieces);
    }
  }

  joinUrl(...pieces: string[]): string {
    let result = "";
    for (let p of pieces)
      result = Location.joinWithSlash(result, p);
    return result;
  }

  raiseError(err: Error): void {
    console.error(err);
    this.onError.emit(err);
  }

}
