import * as L from 'leaflet';


export const LeafletMeasureLayer = L.Layer.extend({
    _mapEvents: null,
    _map: null,
    _measureLine: null,
    _measurePopup: null,
    _measuring: false,
    _distance: null,
    initialize(options) {
        if (L.Layer.prototype.initialize)
            L.Layer.prototype.initialize.call(this, options);
        L.setOptions(this, options);


    },
    onAdd(map) {
        this._measureLine = L.polyline([], {
            pane: this.options.pane,
            color: "#fff",
            weight: 3,
            dashArray: "10 10",
        });
        this._measurePopup = L.popup({
            pane: this.options.pane,
            closeButton: false,
            //autoPan: false
        }, this).setLatLng([0, 0]);

        this._measuring = false;

        let mapEvents = this._mapEvents = {
            "mousedown": this._measureStart,
            "mousemove": this._measureMove,
            "mouseleave": this._measureEnd,
            "mouseup": this._measureEnd
        }

        for (let evt in mapEvents) {
            map.on(evt, mapEvents[evt], this);
        }

        this._map = map;

    },
    onRemove(map) {
        for (let evt in this._mapEvents) {
            map.off(evt, this._mapEvents[evt], this);
        }

        this._measureEnd();

        this._map = null;

    },
    _measureStart(evt) {

        this._measureEnd();

        this._measuring = true;

        this._measureLine.setLatLngs([
            this._map.mouseEventToLatLng(evt.originalEvent),
            this._map.mouseEventToLatLng(evt.originalEvent)]
        );

        this._redrawMeasureControls();

        this._map.addLayer(this._measureLine);
        this._map.addLayer(this._measurePopup);

    },
    _measureMove(evt) {
        if (this._measuring) {
            this._measureLine.getLatLngs()[1] = this._map.mouseEventToLatLng(evt.originalEvent);
            this._redrawMeasureControls();
        }
    },
    _measureEnd(evt) {
        if (this._measuring) {
            this._map.removeLayer(this._measureLine);
            this._map.removeLayer(this._measurePopup);
            this._measuring = false;
        }
    },
    _redrawMeasureControls() {


        this._distance = this.options.measure(this._measureLine.getLatLngs()[0], this._measureLine.getLatLngs()[1]);
        this._measureLine.redraw();

        this._measurePopup.setContent(this._distance);
        this._measurePopup.setLatLng(this._measureLine.getLatLngs()[1]);
        this._measurePopup.update();

    }

})