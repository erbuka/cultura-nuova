import { Injectable, TemplateRef, EventEmitter, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Location } from '@angular/common';

import * as ajv from "ajv";
import { Item } from './types/item';

const ITEM_SCHEMA = require('./types/schema.json');

export interface Config {
  backgroundImage: string;
  entry: string;
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

  private jsonValidator: ajv.Ajv = null;

  constructor(private httpClient: HttpClient) {
    this.jsonValidator = new ajv({ allErrors: true });
  }

  getConfig(): Observable<Config> {
    return this.httpClient.get<any>("assets/config.json");
  }

  getItem(url: string, handleError: boolean = true): Observable<Item> {

    let obs = this.httpClient.get<any>(this.joinUrl(url, "item.json"), { responseType: "json" });

    obs = obs.pipe(tap((v: Item) => {
      let valid = this.jsonValidator.validate(ITEM_SCHEMA, v);

      if (!valid) {
        this.raiseError({
          description: `Some errors occured during schema validation (${url}):<br> ${
            this.jsonValidator.errors.reduce((prev, e) => prev + `- JSON${e.dataPath} ${e.message}<br>`, "")
            }`
        })
      }

    }));

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

  resolveUrl(url: string, item: Item) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    } else if (url.startsWith(".") || url.startsWith("..")) {

      let pieces = item.url.split("/").filter(v => v.trim().length > 0);

      for (let p of url.split("/").filter(v => v.trim().length > 0)) {
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
    } else {
      return url;
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
