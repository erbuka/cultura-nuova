import { Injectable, TemplateRef, EventEmitter, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable, BehaviorSubject } from 'rxjs';
import { Location } from '@angular/common';

import * as ajv from "ajv";
import { Item, LocalizedText } from './types/item';

const ITEM_SCHEMA = require('./types/schema.json');

const SS_LOCALE_ID_KEY = "cn-locale-id";

export type FileChooserConfig = {
  accept: string,
  type: "arraybuffer",
}


export interface ConfigLocale {
  id: string;
  flagIcon?: string;
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


export type ErrorEvent = {
  description: string;
}


export type TextEditEvent = {
  text: LocalizedText;
  multiline: boolean;
  resolve: (data: LocalizedText) => void,
  reject: () => void
}

export type FileChooserEvent = {
  config: FileChooserConfig,
  resolve: (data: string | ArrayBuffer) => void,
  reject: () => void
}

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  _currentLocale: ConfigLocale;

  config: Config = null;

  templates: Map<string, TemplateRef<any>> = new Map();

  onTextEdit: EventEmitter<TextEditEvent> = new EventEmitter();
  onFileChoose: EventEmitter<FileChooserEvent> = new EventEmitter();
  onError: EventEmitter<ErrorEvent> = new EventEmitter();

  private jsonValidator: ajv.Ajv = null;
  private initializeSubject: BehaviorSubject<boolean>;

  constructor(private httpClient: HttpClient) {
    this.jsonValidator = new ajv();
  }

  translate(text: LocalizedText) {
    let locale = this.getCurrentLocale();
    if (typeof text === "object" && locale) {
      let translation = text[locale.id];
      return translation ? translation : `Translation not found for locale "${locale.id}"`;
    } else if (typeof text === "string") {
      return text;
    } else {
      return `Invalid text type: ${typeof text}`;
    }
  }

  getLocales(): ConfigLocale[] {
    if (!this.config.internationalization)
      return [];

    return this.config.internationalization.locales;
  }

  setCurrentLocale(localeId: string, reload: boolean = false) {

    this._currentLocale = null;

    if (!this.config.internationalization)
      throw new Error("No locales have been configured");

    let loc = this.config.internationalization.locales.find(loc => loc.id === localeId);

    if (!loc)
      throw new Error(`Locale not found: ${localeId}`);

    sessionStorage.setItem(SS_LOCALE_ID_KEY, loc.id);

    this._currentLocale = loc;

    if (reload)
      location.reload();

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
              this.setCurrentLocale(sessionStorage.getItem(SS_LOCALE_ID_KEY));
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

  editText(text: LocalizedText, multiline: boolean = false): Promise<LocalizedText> {
    let textCopy = typeof text === "string" ? text : Object.assign({}, text);

    return new Promise((resolve, reject) => {
      this.onTextEdit.emit({
        text: textCopy,
        multiline: multiline,
        resolve: resolve,
        reject: reject
      })
    });

  }

  fileChooser(config?: { type?: "arraybuffer", accept?: string }): Promise<ArrayBuffer>;
  fileChooser(config?: Partial<FileChooserConfig>): Promise<string | ArrayBuffer> {

    let cfg: FileChooserConfig = {
      type: "arraybuffer",
      accept: ".*"
    };


    if (config) {
      Object.assign(cfg, config);
    }

    return new Promise((resolve, reject) => {
      this.onFileChoose.emit({
        config: cfg,
        resolve: resolve,
        reject: reject
      });
    });

  }

  joinUrl(...pieces: string[]): string {
    let result = "";
    for (let p of pieces)
      result = Location.joinWithSlash(result, p);
    return result;
  }

  raiseError(err: ErrorEvent): void {
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
