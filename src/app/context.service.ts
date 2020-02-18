import { Injectable, TemplateRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Location } from '@angular/common';


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
  groups: {
    name: string,
    options: {},
    items: {
      title: string,
      image: string,
      href: string
    }[]
  }[]
}

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  templates: Map<string, TemplateRef<any>> = new Map();

  constructor(private httpClient: HttpClient, private location: Location) {

  }

  getConfig(): Observable<Config> {
    return this.httpClient.get<any>("/assets/config.json");
  }

  getItem(url: string): Observable<Item> {
    return this.httpClient.get<any>(this.joinUrl("assets", url, "item.json"), { responseType: "json" }).pipe(
      tap(x => x, e => console.error(e.message)),
      map(x => {
        x.url = url;
        return <Item>x;
      })
    )
  }

  getTemplate(name: string): TemplateRef<any> {
    return this.templates.get(name);
  }

  registerTemplate(name: string, ref: TemplateRef<any>) {
    this.templates.set(name, ref);
  }

  resolveUrl(itemUrl: string) {
    if (itemUrl.startsWith("/") || itemUrl.startsWith("http://") || itemUrl.startsWith("https://")) {
      return itemUrl;
    } else {

      let pieces = this.location.path().split("/").filter(v => v.trim().length > 0);

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

      return this.joinUrl(...pieces);
    }
  }

  private joinUrl(...pieces: string[]): string {
    let result = "";
    for (let p of pieces)
      result = Location.joinWithSlash(result, p);
    return result;
  }

}
