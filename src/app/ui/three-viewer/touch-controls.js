import { PerspectiveCamera, Raycaster, Vector3, Clock } from 'three';
import * as hammer from "hammerjs";

/**
 * 
 * @param {Vector3} pos 
 * @param {Vector3} target 
 * @param {number} maxSpeed 
 */
const moveTowards = function (pos, target, maxSpeed) {

    maxSpeed = maxSpeed || 0;

    let len = pos.distanceToSquared(target);

    if (len <= maxSpeed * maxSpeed) {
        pos.copy(target);
    } else {
        let dir = target.clone().sub(pos).normalize();
        pos.add(dir.multiplyScalar(maxSpeed));
    }
}


class EventHandlers {
    constructor() {
        /**
         * @private
         * @property {Array} handlers
         */
        this.handlers = [];
    }

    /**
     * 
     * @param {string} evtName 
     * @param {HTMLElement} target 
     * @param {Function} handler 
     */
    bind(evtName, target, handler) {

        target.addEventListener(evtName, handler);

        this.handlers.push({
            evtName: evtName,
            target: target,
            handler: handler
        });

    }

    dispose() {
        for (let h of this.handlers) {
            h.target.removeEventListener(h.evtName, h.handler);
        }
    }
}

export class TouchControls {

    /**
     * 
     * @param {PerspectiveCamera} camera 
     * @param {HTMLElement} domElement 
     */
    constructor(camera, domElement) {

        /**
         * @property {PerspectiveCamera} camera
         */
        this.camera = camera;

        /**
         * @property {HTMLElement} domElement
         */
        this.domElement = domElement;

        /**
         * @property {boolean} enabled
         */
        this._enabled = true;
        Object.defineProperty(this, "enabled", {
            set: function (value) {
                if (value && !this._enabled)
                    this.targetPosition.copy(this.camera.position);

                this._enabled = value;
            },
            get: function () {
                return this._enabled;
            }
        });
        /**
         * @property {number} rotationSpeed
         */
        this.rotationSpeed = 2;

        /**
         * @property {number} zoomSpeed
         */
        this.zoomSpeed = Number.POSITIVE_INFINITY;

        /**
         * @property {number} wheelZoomStep
         */
        this.wheelZoomStep = 1;

        /**
         * @private
         * @property {Vector3} targetPosition 
         */
        this.targetPosition = new Vector3().copy(camera.position);

        /**
         * @private
         * @property {Raycaster} raycaster
         */
        this.raycaster = new Raycaster();

        /**
         * @private
         * @property {Clock} clock
         */
        this.clock = new Clock(true);

        /**
         * @private
         * @property {EventHandlers} eventHandlers
         */
        this.eventHandlers = new EventHandlers();

        /**
         * @private
         * @property {boolean} disposed
         */
        this.disposed = false;

        /**
         * @private
         * @property {hammer.Hammer} hammer
         */
        this.hammer = new hammer(this.domElement);

        // Setup hammer
        this.hammer.get("pan").set({ direction: hammer.DIRECTION_ALL });
        this.hammer.get('pinch').set({ enable: true });

        this.hammer.on("pan", this.onPan.bind(this));
        this.hammer.on("pinch", this.onPinch.bind(this));

        // Setup mouse/keyboard events
        this.eventHandlers.bind("wheel", this.domElement, this.onMouseWheel.bind(this));

        // Run
        this.onAnimationFrame();

    }


    onAnimationFrame() {
        if (this.disposed)
            return;

        requestAnimationFrame(this.onAnimationFrame.bind(this));

        let dt = this.clock.getDelta();

        if (this.enabled) {
            // Move the camera towards target location
            moveTowards(this.camera.position, this.targetPosition, this.zoomSpeed * dt);
        }

    }

    /**
     * 
     * @param {WheelEvent} evt 
     */
    onMouseWheel(evt) {

        if (this.enabled) {

            let delta = -Math.sign(evt.deltaY) * this.wheelZoomStep;

            let dir = new Vector3();

            this.camera.getWorldDirection(dir);

            this.targetPosition.copy(dir.multiplyScalar(delta).add(this.camera.position));
        }
    }

    /**
     * @private
     * @param {hammer.Event} evt 
     * @returns {void}
     */
    onPan(evt) {

        if (this.enabled) {

            let srcEvent = evt.srcEvent;

            let dx = -srcEvent.movementX / (this.domElement.clientWidth / 2) * this.rotationSpeed;
            let dy = srcEvent.movementY / (this.domElement.clientHeight / 2) * this.rotationSpeed;

            this.raycaster.setFromCamera({
                x: dx,
                y: dy
            }, this.camera);

            this.camera.lookAt(this.camera.position.clone().add(this.raycaster.ray.direction));

        }

    }

    /**
     * @private
     * @param {hammer.Event} evt 
     * @returns {void}
     */
    onPinch(evt) {

        if (this.enabled) {
            console.log(evt);

        }

    }

    /**
     * @returns {void}
     */
    dispose() {
        this.disposed = true;
        this.hammer.destroy();
        this.eventHandlers.dispose();
    }




}