import * as three from 'three';
import { Vector2, Box2, Mesh, Vector3, Color, BufferGeometry } from 'three';

const moveTowards = function (n: number, target: number, maxDelta: number) {
    return Math.abs(target - n) <= maxDelta ? target : n + Math.sign(target - n) * maxDelta;
}

class Cache<K extends (string | number), T extends { dispose?: () => void }> {

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

}

class EventHandlers {
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

}

export interface DeepZoomOptions {
    zoomAnimationSpeed: number;
}

export class DeepZoom {

    private _disposed: boolean = false;
    private _layers: Layer[] = [];
    private _prevTime: number = 0;
    private _container: HTMLElement = null;
    private _handlers: EventHandlers = new EventHandlers();
    private _zoom: number = 0;
    private _desiredZoom: number = 0;
    private _width: number = 0;
    private _height: number = 0;
    private _viewCenter: three.Vector3 = new Vector3();
    private _camera: three.OrthographicCamera = new three.OrthographicCamera(0, 1, 0, 1, -1, 1);

    public options: DeepZoomOptions;

    private _mouse = {
        x: 0,
        y: 0,
        dragging: false,
        leftButtonDown: false
    }

    get width(): number { return this._width; }
    get height(): number { return this._height; }
    get zoom(): number { return this._zoom; }
    set zoom(z: number) { this._desiredZoom = z; }

    constructor(container: HTMLElement, options?: Partial<DeepZoomOptions>) {

        this.options = {
            zoomAnimationSpeed: 2
        }

        if (options) {
            Object.assign(this.options, options);
        }

        this._container = container;
        this.start();
    }

    start(): void {

        let clearMouse = (evt: MouseEvent) => {
            this._mouse.dragging = false;
            this._mouse.leftButtonDown = false;
        }

        this._handlers.register(window, "resize", this.resize.bind(this));

        this._handlers.register(this._container, "mousedown", (evt: MouseEvent) => {
            this._mouse.leftButtonDown = evt.button == 0;
            this._mouse.x = evt.offsetX;
            this._mouse.y = evt.offsetY;
        });

        this._handlers.register(this._container, "mousemove", (evt: MouseEvent) => {
            if (this._mouse.leftButtonDown) {
                this._mouse.dragging = true;

                let delta = this.screenToWorld(evt.offsetX, evt.offsetY).sub(this.screenToWorld(this._mouse.x, this._mouse.y));

                this._viewCenter.sub(delta);

            }
            this._mouse.x = evt.offsetX;
            this._mouse.y = evt.offsetY;


        });

        this._handlers.register(this._container, "mousewheel", (evt: WheelEvent) => {
            let delta = Math.sign(evt.deltaY);
            this.zoom -= delta;
        });

        this._handlers.register(this._container, "mouseleave", clearMouse);
        this._handlers.register(this._container, "mouseup", clearMouse);

        this._prevTime = Date.now();
        this.resize();
        this.loop();
    }

    addLayer(l: Layer): void {
        let c = l.getContainer();

        l.setParent(this);

        this._container.appendChild(c);
        c.style.position = "absolute";
        c.style.left = "0px";
        c.style.top = "0px";

        this._layers.push(l);
        this.resize();
    }

    removeLayer(l: Layer): void {
        l.setParent(null);
        this._container.removeChild(l.getContainer());
        this._layers.splice(this._layers.findIndex(k => k === l));
    }

    dispose(): void {
        this._handlers.cleanup();
        this._disposed = true;
    }

    render(dt: number): void {
        this.updateZoom(dt);
        this.updateProjectionMatrix();

        this._layers.forEach((l, i) => {
            let container = l.getContainer();
            container.style.zIndex = i + "";
            container.style.opacity = l.options.opacity + "";
        });
        this._layers.forEach(l => l.getContainer().style.display = l.options.visible ? "block" : "none");
        this._layers.filter(l => l.options.visible).forEach(l => l.render(dt));
    }

    loop(): void {

        if (this._disposed)
            return;

        window.requestAnimationFrame(this.loop.bind(this));
        let now = Date.now();
        let dt = (now - this._prevTime) / 1000.0;
        this._prevTime = now;
        this.render(dt);
    }

    resize(): void {
        let w = this._width = this._container.clientWidth;
        let h = this._height = this._container.clientHeight;
        this._layers.forEach(l => l.resize(w, h));
    }


    getCamera(): three.OrthographicCamera { return this._camera; }

    getViewCenter(): three.Vector3 {
        return this._viewCenter.clone();
    }

    screenToWorld(x: number, y: number): Vector3 {
        x = x / this._width * 2 - 1;
        y = -y / this._height * 2 + 1
        return new Vector3(x, y, 0).unproject(this._camera);
    }



    private updateZoom(dt: number): void {
        this._zoom = moveTowards(this._zoom, this._desiredZoom, this.options.zoomAnimationSpeed * dt);
    }

    private updateProjectionMatrix(): void {
        let c = this._viewCenter;
        let zDiv = 1.0 / Math.pow(2, this.zoom);

        let w = zDiv * this._width;
        let h = zDiv * this._height;

        this._camera.left = c.x - w / 2;
        this._camera.right = c.x + w / 2;
        this._camera.top = c.y + h / 2;
        this._camera.bottom = c.y - h / 2;
        this._camera.updateProjectionMatrix();

    }

}


export interface LayerOptions {
    opacity?: number;
    visible?: boolean;
    color?: string;
}


export abstract class Layer {

    protected _parent: DeepZoom = null;

    options: LayerOptions = null;

    constructor(options: LayerOptions) {
        this.options = Object.assign({
            opacity: 1,
            visible: true,
            color: "#ffffff"
        }, options);
    }

    setParent(parent: DeepZoom): void { this._parent = parent; }

    abstract render(dt: number): void;
    abstract getContainer(): HTMLElement;
    abstract resize(w: number, h: number);
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

    private _container: HTMLCanvasElement;
    private _renderer: three.WebGLRenderer;
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
    private _textureCache: Cache<string, three.Texture> = new Cache();


    options: DeepImageLayerOptions;

    constructor(options: DeepImageLayerOptions) {
        super(options);

        {
            let renderer = new three.WebGLRenderer({
                depth: false,
                alpha: true,
                premultipliedAlpha: false
            });

            renderer.setClearColor(0, 0);
            this._renderer = renderer;
        }


        this._container = this._renderer.domElement;

        // Compute zoomLevels
        {
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

    }

    dispose(): void {
        this._textureCache.clear();
    }

    resize(w: number, h: number): void {
        this._container.width = w;
        this._container.height = h;
    }

    getContainer(): HTMLElement {
        return this._container;
    }

    render(dt: number): void {


        let renderer = this._renderer;
        let scene = new three.Scene();
        let parent = this._parent;
        let camera = parent.getCamera();


        let z = parent.zoom + this.options.maxZoom;
        let z0 = Math.ceil(z);
        let z1 = z0 - 1;
        let zDelta = z - z1;


        renderer.setViewport(0, 0, this._container.width, this._container.height);

        let mz0 = this.getMeshForZoom(dt, z0, 1, false);
        let mz1 = this.getMeshForZoom(dt, z1, 1 - zDelta, true);

        if (mz0)
            scene.add(...mz0);
        if (mz1)
            scene.add(...mz1);
        

        renderer.render(scene, camera);

        scene.dispose();


    }

    private hashTileCoord(x: number, y: number, z:number): string {
        return `${x}-${y}-${z}`;
    }

    private getMeshForZoom(dt: number, zoom: number, opacity: number, replace: boolean): Mesh[] {

        if (zoom - 2 * this.options.maxZoom > 0)
            return null;

        let zoomLevel = this._zoomLevels[zoom];


        let result: Mesh[] = [];

        let textureLoader = new three.TextureLoader();

        let tx = zoomLevel.tilesX;
        let ty = zoomLevel.tilesY;

        let camera = this._parent.getCamera();

        let worldTileWidth = zoomLevel.worldTileWidth;
        let worldTileHeight = zoomLevel.worldTileHeight;

        let minX = Math.max(0, Math.floor(camera.left / worldTileWidth))
        let minY = Math.max(0, Math.floor(camera.bottom / worldTileHeight));
        let maxX = Math.min(tx - 1, Math.ceil(camera.right / worldTileWidth));
        let maxY = Math.min(ty - 1, camera.top / worldTileHeight);

        let plane = new three.PlaneGeometry(worldTileWidth, worldTileHeight, 1, 1);

        let wireframeMat = new three.MeshBasicMaterial({
            transparent: true,
            wireframe: true,
        });

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {

                let coordsHash = this.hashTileCoord(x, y, zoom);
                let tileUrl = this.options.getTileURL(zoom, x, y);

                let mesh: three.Mesh;


                let texture: three.Texture = this._textureCache.get(coordsHash);

                if (!texture) {
                    texture = textureLoader.load(tileUrl);
                    texture.flipY = false;
                    this._textureCache.put(coordsHash, texture);
                }


                let material = new three.MeshBasicMaterial({
                    transparent: true,
                    opacity: opacity,
                    map: texture
                });

                if (x === maxX || y === maxY) {

                    let tw = x === maxX ? zoomLevel.viewportExcessX : worldTileWidth;
                    let th = y === maxY ? zoomLevel.viewportExcessY : worldTileHeight;


                    let geom = new three.PlaneGeometry(tw, th, 1, 1);
                    mesh = new three.Mesh(geom, material);
                    mesh.position.add(new three.Vector3(x * worldTileWidth + tw * .5, y * worldTileHeight + th * .5));
                } else {
                    mesh = new three.Mesh(plane, material);
                    mesh.position.add(new three.Vector3((x + .5) * worldTileWidth, (y + .5) * worldTileHeight));
                }
                result.push(mesh);

                {
                    let wfMesh = mesh.clone();
                    wfMesh.material = wireframeMat;
                    result.push(wfMesh);
                }

            }
        }

        return result;
    }


}