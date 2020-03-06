import { Injectable, TemplateRef, EventEmitter, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable, BehaviorSubject } from 'rxjs';
import { Location } from '@angular/common';

import * as ajv from "ajv";
import { Item } from './types/item';

const ITEM_SCHEMA = require('./types/schema.json');

interface ConfigLocale {
  id: string;
  description: string;
}

export interface Config {
  backgroundImage: string;
  entry: string;
  internationalization?: {
    defaultLocale: string,
    locales: ConfigLocale[]
  }
}


export type Error = {
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  _currentLocale: ConfigLocale;

  config: Config = null;

  templates: Map<string, TemplateRef<any>> = new Map();

  onError: EventEmitter<Error> = new EventEmitter();

  private jsonValidator: ajv.Ajv = null;
  private initializeSubject: BehaviorSubject<boolean>;

  constructor(private httpClient: HttpClient) {
    this.jsonValidator = new ajv({ allErrors: true });
  }

  getLocales(): ConfigLocale[] {
    if (!this.config.internationalization)
      return [];

    return this.config.internationalization.locales;
  }

  setCurrentLocale(localeId: string) {

    this._currentLocale = null;

    if (!this.config.internationalization)
      throw new Error("No locale have been configured");

    let loc = this.config.internationalization.locales.find(loc => loc.id === localeId);

    if (!loc)
      throw new Error(`Locale not found: ${localeId}`);

    sessionStorage.setItem("cn-locale-id", loc.id);

    this._currentLocale = loc;

  }

  getCurrentLocale(): ConfigLocale {
    return this._currentLocale;
  }


  initialize(): BehaviorSubject<boolean> {
    if (!this.initializeSubject) {
      this.initializeSubject = new BehaviorSubject(false);
      this.httpClient.get<Config>("assets/config.json").subscribe({
        next: v => {
          this.config = v;

          if (this.config.internationalization) {

            try {
              this.setCurrentLocale(sessionStorage.getItem("cn-locale-id"));
            }
            catch (e) {
              this.setCurrentLocale(this.config.internationalization.defaultLocale);
            }

          }

          this.initializeSubject.next(true);
        }
      })
    }
    return this.initializeSubject;
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

  assign<T, X, Y>(t: T, x: X, y: Y): T & X & Y;
  assign(t: any, ...sources: any): any {
    return Object.assign(t, ...sources.map(x =>
      Object.entries(x)
        .filter(([key, val]) => val !== undefined)
        .reduce((obj, [key, val]) => { obj[key] = val; return obj; }, {})
    ))
  };

}
