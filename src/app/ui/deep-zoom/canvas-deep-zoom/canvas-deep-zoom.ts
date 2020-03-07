
const moveTowards = function (n: number, target: number, maxDelta: number): number {
    return Math.abs(target - n) <= maxDelta ? target : n + Math.sign(target - n) * maxDelta;
}

const clamp = function (val: number, a: number, b: number): number {
    return Math.min(Math.max(val, a), b);
}

interface Disposable {
    dispose(): void;
}

interface IVector {
    x: number;
    y: number;
}

const vectorScale = function (a: IVector, b: number | IVector) {

    if (typeof b === "number") {
        return {
            x: a.x * b,
            y: a.y * b
        }
    } else {
        return {
            x: a.x * b.x,
            y: a.y * b.y
        }
    }

}


const vectorAdd = function (a: IVector, b: IVector) {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
}

const vectorSub = function (a: IVector, b: IVector) {
    return {
        x: a.x - b.x,
        y: a.y - b.y
    }
}

class Cache<K extends (string | number), T extends (any & Partial<Disposable>)> implements Disposable {


    private cacheMap: Map<K, T> = new Map();

    constructor() {

    }

    get(key: K): T | null {
        if (this.cacheMap.has(key))
            return this.cacheMap.get(key);
        return null;
    }

    put(key: K, value: T): void {
        this.cacheMap.set(key, value);
    }

    clear(): void {
        for (let v of this.cacheMap.values()) {
            if (v.dispose)
                v.dispose();
        }
        this.cacheMap.clear();
    }

    dispose(): void {
        this.clear();
    }

}

class Buffer<T extends Partial<Disposable>> implements Disposable {

    private elements: T[] = [];
    private currentIndex: number = 0;

    constructor(private constructFn: () => T, initialSize: number) {
        for (let i = 0; i < initialSize; i++)
            this.elements.push(constructFn());
    }

    begin(): void {
        this.currentIndex = 0;
    }

    next(): T {
        if (this.currentIndex >= this.elements.length)
            this.elements.push(this.constructFn());
        return this.elements[this.currentIndex++];
    }

    dispose(): void {
        this.elements.forEach(e => {
            if (e.dispose)
                e.dispose();
        });
    }

}

class EventHandlers implements Disposable {

    private _handlers: { el: EventTarget, evtName: string, handler: EventListener }[] = [];

    register(el: EventTarget, evtName: string, handler: EventListener): void {
        el.addEventListener(evtName, handler);
        this._handlers.push({
            el: el,
            evtName: evtName,
            handler: handler
        })
    }

    cleanup() {
        for (let h of this._handlers) {
            h.el.removeEventListener(h.evtName, h.handler);
        }
    }

    dispose(): void {
        this.cleanup();
    }

}

class Projection {
    private _scale: IVector;
    private _translate: IVector;

    private _invScale: IVector;
    private _invTranslate: IVector;

    constructor(public left: number = 0, public right: number = 0, public top: number = 1,
        public bottom: number = 1, public viewWidth: number = 1, public viewHeight: number = 1) {
        this.update();
    }

    project(v: IVector): IVector {
        return vectorAdd(vectorScale(v, this._scale), this._translate);
    }

    update() {

        let ox = this.left - Math.floor(this.left);
        let oy = this.top - Math.floor(this.top);

        this.left -= ox;
        this.right -= ox;
        this.top -= oy;
        this.bottom -= oy;


        this._scale = {
            x: (this.right - this.left) / this.viewWidth,
            y: (this.bottom - this.top) / this.viewHeight
        }

        this._translate = {
            x: this.left,
            y: this.top
        }

        this._invScale = {
            x: 1 / this._scale.x,
            y: 1 / this._scale.y
        }

        this._invTranslate = {
            x: -this._translate.x,
            y: -this._translate.y
        }

    }

    transform(ctx: CanvasRenderingContext2D): void {
        ctx.scale(this._invScale.x, this._invScale.y);
        ctx.translate(this._invTranslate.x, this._invTranslate.y);
    }
}

export interface DeepZoomOptions {
    debugMode: boolean;
}

export class DeepZoom implements Disposable {

    private _width: number;
    private _height: number;
    private _disposed: boolean = false;
    private _prevTime: number;
    private _layers: Layer[] = [];

    private _handlers: EventHandlers = new EventHandlers();

    private _lookAt: IVector = { x: 0, y: 0 };
    private _desiredZoom: number = 0;
    private _zoom: number = 0;
    private _projection: Projection = new Projection();

    private _mouse = {
        x: 0,
        y: 0,
        dragging: false,
        leftButtonDown: false
    }

    options: DeepZoomOptions;

    constructor(public container: HTMLElement, options: Partial<DeepZoomOptions>) {
        this.options = Object.assign({
            debugMode: false
        }, options);

        this.start();
    }

    get width(): number { return this._width; }
    get height(): number { return this._height; }
    get projection(): Projection { return this._projection; }
    get zoom(): number { return this._zoom; }
    set zoom(z: number) { this._desiredZoom = Math.min(0, z); }

    async addLayer(l: Layer): Promise<void> {
        if (!this._layers.includes(l)) {
            await l.ready();
            l.onAdd(this);
            l.onResize(this, this.width, this.height);
            this._layers.push(l);
        }
    }

    removeLayer(l: Layer): void {
        if (this._layers.includes(l)) {
            l.onRemove(this);
            this._layers.splice(this._layers.findIndex(x => x === l));
        }
    }

    dispose(): void {
        this._handlers.dispose();
        this._layers.forEach(l => this.removeLayer(l));
        this._disposed = true;
    }



    private start(): void {
        this._prevTime = Date.now();
        this.loop();

        let clearMouse = (evt: MouseEvent) => {
            this._mouse.dragging = false;
            this._mouse.leftButtonDown = false;
        }

        this._handlers.register(window, "resize", (evt) => {
            this.resize();
            this._layers.forEach(l => l.onResize(this, this.width, this.height));
        });


        this._handlers.register(this.container, "mousedown", (evt: MouseEvent) => {
            this._mouse.leftButtonDown = evt.button == 0;
            this._mouse.x = evt.offsetX;
            this._mouse.y = evt.offsetY;
        });

        this._handlers.register(this.container, "mousemove", (evt: MouseEvent) => {


            if (this._mouse.leftButtonDown) {
                this._mouse.dragging = true;


                let delta = vectorSub(
                    this._projection.project({ x: evt.offsetX, y: evt.offsetY }),
                    this._projection.project({ x: this._mouse.x, y: this._mouse.y })
                );

                this._lookAt = vectorSub(this._lookAt, delta);

            }
            this._mouse.x = evt.offsetX;
            this._mouse.y = evt.offsetY;


        });

        this._handlers.register(this.container, "mousewheel", (evt: WheelEvent) => {
            let delta = Math.sign(evt.deltaY);
            this.zoom -= delta;
        });

        this._handlers.register(this.container, "mouseleave", clearMouse);
        this._handlers.register(this.container, "mouseup", clearMouse);


        this.resize();

    }

    private resize(): void {
        this._width = this.container.clientWidth;
        this._height = this.container.clientHeight;
    }

    private render(dt: number): void {
        this._layers.forEach(l => l.onRender(this, dt));
    }

    private loop(): void {
        if (this._disposed)
            return;

        let now = Date.now();
        let dt = (now - this._prevTime) / 1000.0;
        this._prevTime = now;

        this.updateProjection();
        this.updateZoom(dt);
        this.render(dt);

        requestAnimationFrame(this.loop.bind(this));
    }

    private updateZoom(dt: number) {
        this._zoom = moveTowards(this._zoom, this._desiredZoom, 2 * dt);
    }

    private updateProjection() {
        let proj = this._projection;

        let zDiv = Math.pow(2, this._zoom);

        proj.viewWidth = this.width;
        proj.viewHeight = this.height;
        proj.left = (-this.width / 2) / zDiv + this._lookAt.x;
        proj.right = (this.width / 2) / zDiv + this._lookAt.x;
        proj.top = (-this.height / 2) / zDiv + this._lookAt.y;
        proj.bottom = (this.height / 2) / zDiv + this._lookAt.y;

        proj.update();
    }

}

export interface LayerOptions {
    opacity?: number;
    visible?: boolean;
    color?: string;
}

export abstract class Layer implements Disposable {

    options: LayerOptions;

    constructor(options: LayerOptions) {
        this.options = Object.assign({
            opacity: 1,
            visible: true,
            color: "#ffffff"
        }, options);
    }

    abstract onResize(dz: DeepZoom, w: number, h: number): void;
    abstract onRender(dz: DeepZoom, dt: number): void;

    abstract onAdd(dz: DeepZoom): void;
    abstract onRemove(dz: DeepZoom): void;

    abstract ready(): Promise<void>;
    abstract dispose(): void;
}

export interface DeepImageLayerOptions extends LayerOptions {
    tileSize: number;
    tileOverlap: number;
    viewportWidth: number;
    viewportHeight: number;
    width: number;
    height: number;
    minZoom: number;
    maxZoom: number;
    getTileURL(zoom: number, x: number, y: number): string;
}

export class DeepImageLayer extends Layer {

    private _container: HTMLCanvasElement
    private _readyPromise: Promise<void>;
    private _zoomLevels: {
        [key: number]: {
            zoom: number,
            width: number,
            height: number,
            tilesX: number,
            tilesY: number,
            excessX: number,
            excessY: number,
            viewportExcessX: number,
            viewportExcessY: number,
            worldTileWidth: number,
            worldTileHeight: number
        }
    } = null;

    private _imageCache: Cache<string, HTMLImageElement> = new Cache();

    public options: DeepImageLayerOptions;

    constructor(options: DeepImageLayerOptions) {
        super(options);
    }

    onResize(dz: DeepZoom, w: number, h: number): void {
        this._container.width = w;
        this._container.height = h;
    }

    onRender(dz: DeepZoom, dt: number) {

        let ctx = this._container.getContext("2d");

        let opacity: number = 0;
        if (dz.zoom >= this.options.minZoom && dz.zoom <= this.options.maxZoom) {
            opacity = this.options.opacity;
        } else {
            if (dz.zoom > this.options.maxZoom) {
                opacity = clamp((1 - (dz.zoom - this.options.maxZoom)) * 2, 0, 1) * this.options.opacity;
            }
        }


        this._container.style.opacity = opacity + "";
        this._container.style.display = this.options.visible ? "block" : "none";

        ctx.save();
        {
            // clear
            ctx.clearRect(0, 0, dz.width, dz.height);

            dz.projection.transform(ctx);

            let z0 = Math.ceil(dz.zoom);


            for (let i = this.options.minZoom; i <= z0; i++)
                this.renderLevel(dz, i, ctx);

            //this.renderLevel(dz, z0, ctx);


        }
        ctx.restore();
    }

    private renderLevel(dz: DeepZoom, zoom: number, ctx: CanvasRenderingContext2D) {
        if (zoom - this.options.maxZoom > 0)
            return;

        let zoomLevel = this._zoomLevels[zoom];

        let tx = zoomLevel.tilesX;
        let ty = zoomLevel.tilesY;

        let projection = dz.projection;

        let worldTileWidth = zoomLevel.worldTileWidth;
        let worldTileHeight = zoomLevel.worldTileHeight;

        let minX = Math.max(0, Math.floor(projection.left / worldTileWidth))
        let minY = Math.max(0, Math.floor(projection.top / worldTileHeight));
        let maxX = Math.min(tx - 1, Math.ceil(projection.right / worldTileWidth));
        let maxY = Math.min(ty - 1, Math.ceil(projection.bottom / worldTileHeight));

        let overlap = this.options.tileOverlap;


        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {

                let hash = this.hashTileCoord(x, y, zoom);

                let tileWidth = x === tx - 1 && zoomLevel.excessX > 0 ? zoomLevel.excessX : this.options.tileSize;
                let tileHeight = y === ty - 1 && zoomLevel.excessY > 0 ? zoomLevel.excessY : this.options.tileSize;


                let sx = x === 0 ? 0 : overlap;
                let sy = y === 0 ? 0 : overlap;
                let sw = tileWidth;
                let sh = tileHeight;

                let tileUrl = this.options.getTileURL(zoom, x, y);

                let img: HTMLImageElement = this._imageCache.get(hash);
                if (!img) {
                    img = new Image();
                    img.src = tileUrl;
                    this._imageCache.put(hash, img);
                }

                if (!img.complete)
                    continue;

                let tw: number = worldTileWidth;
                let th: number = worldTileHeight;

                if (x === maxX || y === maxY) {
                    tw = x === maxX && zoomLevel.viewportExcessX > 0 ? zoomLevel.viewportExcessX : worldTileWidth;
                    th = y === maxY && zoomLevel.viewportExcessY > 0 ? zoomLevel.viewportExcessY : worldTileHeight;
                }

                ctx.clearRect(x * worldTileWidth, y * worldTileHeight, tw, th);
                ctx.drawImage(img, sx, sy, sw, sh, x * worldTileWidth, y * worldTileHeight, tw, th);

                if (dz.options.debugMode) {
                    let fontSize = 18 * Math.pow(2, -dz.zoom)
                    ctx.font = `${fontSize}px Arial`;
                    ctx.fillStyle = ctx.strokeStyle = "rgba(0,0,0,.25)";
                    ctx.lineWidth = Math.pow(2, -dz.zoom);
                    ctx.strokeRect(x * worldTileWidth, y * worldTileHeight, tw, th);
                    ctx.fillText(`(${x}, ${y}, ${zoom})`, x * worldTileWidth + 2, y * worldTileHeight + fontSize);
                }

            }
        }

    }

    onAdd(dz: DeepZoom): void {
        dz.container.appendChild(this._container);
    }

    onRemove(dz: DeepZoom): void {
        dz.container.appendChild(this._container);
    }


    ready(): Promise<void> {
        if (!this._readyPromise) {
            this._readyPromise = new Promise((resolve, reject) => {
                let container = document.createElement("canvas");

                container.style.position = "absolute";
                container.style.left = "0px";
                container.style.top = "0px";

                this._container = container;

                // Compute zoomLevels
                {
                    let options = this.options;
                    let w = options.width, h = options.height;
                    this._zoomLevels = {};

                    for (let z = options.maxZoom; z >= options.minZoom; z--) {

                        let tilesX = Math.ceil(w / options.tileSize);
                        let tilesY = Math.ceil(h / options.tileSize);

                        let excessX = options.tileSize - (tilesX * options.tileSize - w);
                        let excessY = options.tileSize - (tilesY * options.tileSize - h);

                        let worldTileWidth = options.viewportWidth / (tilesX - 1 + excessX / options.tileSize);
                        let worldTileHeight = options.viewportHeight / (tilesY - 1 + excessY / options.tileSize);

                        let viewportExcessX = excessX / options.tileSize * worldTileWidth;
                        let viewportExcessY = excessY / options.tileSize * worldTileHeight;

                        this._zoomLevels[z] = {
                            zoom: z,
                            width: w,
                            height: h,
                            tilesX: tilesX,
                            tilesY: tilesY,
                            excessX: excessX,
                            excessY: excessY,
                            viewportExcessX: viewportExcessX,
                            viewportExcessY: viewportExcessY,
                            worldTileWidth: worldTileWidth,
                            worldTileHeight: worldTileHeight
                        };

                        w = Math.ceil(w / 2);
                        h = Math.ceil(h / 2);
                    }

                }

                console.log(this._zoomLevels);


                resolve();
            });

        }


        return this._readyPromise;
    }

    dispose(): void {
        this._imageCache.dispose();
    }

    private hashTileCoord(x: number, y: number, z: number): string {
        return `${x}-${y}-${z}`;
    }


}