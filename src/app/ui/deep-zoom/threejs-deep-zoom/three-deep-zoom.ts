import * as three from 'three';
import { Vector2, Box2, Mesh, Vector3, Color } from 'three';

const moveTowards = function (n: number, target: number, maxDelta: number) {
    return Math.abs(target - n) <= maxDelta ? target : n + Math.sign(target - n) * maxDelta;
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

export interface DeepImageLayerOptions extends LayerOptions {
    tileSize: number,
    tileOverlap: number,
    viewportWidth: number,
    viewportHeight: number,
    width: number,
    height: number,
    maxZoom: number;
    getTileURL(): string;
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
}

export class DeepImageLayer extends Layer {
    _container: HTMLCanvasElement;
    _renderer: three.WebGLRenderer;
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
            scene.add(mz0);

        
        if (mz1)
            scene.add(mz1);
        
        renderer.render(scene, camera);

    }

    private getMeshForZoom(dt: number, zoom: number, opacity: number, replace: boolean): Mesh {

        if (zoom - 2 * this.options.maxZoom > 0)
            return null;

        console.log(this._parent.zoom);

        let geom = new three.PlaneBufferGeometry(this.options.viewportWidth, this.options.viewportHeight, 1, 1);
        geom.translate(this.options.viewportWidth / 2, this.options.viewportHeight / 2, 0);

        let mat = new three.MeshBasicMaterial({
            color: new Color(this.options.color),
            transparent: true,
            opacity: opacity,
        });

        return new Mesh(geom, mat);
    }


}