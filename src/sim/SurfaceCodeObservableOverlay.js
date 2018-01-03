import {makeGrid} from 'src/sim/Util.js'
import {Axis} from "src/sim/Axis.js";
import {ObservableProduct} from "src/sim/ObservableProduct.js";
import {config} from "src/config.js";

class SurfaceQubitObservable {
    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!Axis} axis
     */
    constructor(i, j, axis) {
        this.i = i;
        this.j = j;
        this.axis = axis;
    }

    /**
     * @param {!SurfaceCode} surface
     * @returns {!ObservableProduct}
     */
    stateProductFrom(surface) {
        let q = surface.state.qubitMap.get(surface.qubits[this.i][this.j]);
        return this.axis.isX() ? q.obsX : q.obsZ;
    }


    /**
     * @param {*|!SurfaceQubitObservable} other
     * @returns {!boolean}
     */
    isEqualTo(other) {
        return other instanceof SurfaceQubitObservable &&
            other.i === this.i &&
            other.j === this.j &&
            other.axis === this.axis;
    }

    /**
     * @returns {!string}
     */
    toString() {
        return `${this.axis.toString()}[${this.i}][${this.j}]`
    }

    /**
     * @returns {!SurfaceQubitObservable}
     */
    clone() {
        return new SurfaceQubitObservable(this.i, this.j, this.axis);
    }
}

class SurfaceMultiObservable {
    /**
     * @param {!Array.<!SurfaceQubitObservable>} qubitObservables
     */
    constructor(qubitObservables=[]) {
        this.qubitObservables = qubitObservables;
    }

    /**
     * @param {!SurfaceCode} surface
     * @returns {!ObservableProduct}
     */
    stateProductFrom(surface) {
        return ObservableProduct.product(this.qubitObservables.map(e => e.stateProductFrom(surface)));
    }

    /**
     * @returns {!SurfaceMultiObservable}
     */
    clone() {
        let r = new SurfaceMultiObservable();
        r.qubitObservables = this.qubitObservables.map(e => e.clone());
        return r;
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!SurfaceCode} surface
     */
    draw(ctx, surface) {
        if (this.qubitObservables.length === 0) {
            return;
        }

        ctx.save();
        try {
            let shifts = makeGrid(
                surface.layout.width+2,
                surface.layout.height+2,
                () => [Math.random() * 2 - 1, Math.random() * 2 - 1]);

            // ctx.beginPath();
            // ctx.moveTo(
            //     (this.qubitObservables[0].i + 0.5) * config.diam,
            //     (this.qubitObservables[0].j + 0.5) * config.diam);
            // for (let i = 1; i < this.qubitObservables.length; i++) {
            //     let q = this.qubitObservables[i];
            //     ctx.lineTo(
            //         (q.i + 0.5) * config.diam + offsets[i][0],
            //         (q.j + 0.5) * config.diam + offsets[i][1]);
            // }
            // ctx.lineWidth = 1;
            // ctx.strokeStyle = 'gray';
            // ctx.stroke();

            for (let i = 0; i < this.qubitObservables.length; i++) {
                let q = this.qubitObservables[i];
                ctx.beginPath();
                let [dx, dy] = surface.layout.errorCurveOrientation(q.i, q.j, q.axis.opposite());
                ctx.moveTo(
                    (q.i + 0.5 + dx) * config.diam + shifts[q.i+dx+1][q.j+dy+1][0],
                    (q.j + 0.5 + dy) * config.diam + shifts[q.i+dx+1][q.j+dy+1][1]);
                ctx.lineTo(
                    (q.i + 0.5 - dx) * config.diam + shifts[q.i-dx+1][q.j-dy+1][0],
                    (q.j + 0.5 - dy) * config.diam + shifts[q.i-dx+1][q.j-dy+1][1]);
                ctx.lineWidth = 3;
                ctx.strokeStyle = q.axis.opposite().isX() ? config.xOnColor : config.zOnColor;
                ctx.stroke();
            }

            for (let k = 0; k < this.qubitObservables.length; k++) {
                let {i, j, axis} = this.qubitObservables[k];
                ctx.fillStyle = axis.opposite().isX() ? config.xOnColor : config.zOnColor;
                let [dx, dy] = surface.layout.errorCurveOrientation(i, j, axis.opposite());
                ctx.fillRect(
                    (i + 0.3) * config.diam + (shifts[i+dx+1][j+dy+1][0] + shifts[i-dx+1][j-dy+1][0])/2,
                    (j + 0.3) * config.diam + (shifts[i+dx+1][j+dy+1][1] + shifts[i-dx+1][j-dy+1][1])/2,
                    0.4 * config.diam,
                    0.4 * config.diam);
            }

            let q = this.qubitObservables[this.qubitObservables.length >> 1];
            let stateVal = this.stateProductFrom(surface);
            let state = stateVal.ids.size > 0 ? 'unknown' : stateVal.sign === 1 ? 'OFF' : 'On';
            let px = (q.i + 0.5) * config.diam;
            let py = (q.j + 0.5) * config.diam;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.fillStyle = stateVal.ids.size > 0 ? 'red' : stateVal.sign === 1 ? 'white' : 'orange';
            ctx.textBaseline = 'middle';
            ctx.font = '16pt monospace';
            let w = ctx.measureText(state).width;
            ctx.strokeRect(px + 0.5, py + 0.5, w + 6, config.diam);
            ctx.globalAlpha *= 0.5;
            ctx.fillRect(px + 0.5, py + 0.5, w + 6, config.diam);
            ctx.globalAlpha /= 0.5;
            ctx.fillStyle = '#000';
            ctx.fillText(state, px + 3, py + config.diam*0.5);
        } finally {
            ctx.restore();
        }
    }

    /**
     * @param {!int} index
     * @param {!SurfaceQubitObservable} obs
     */
    insertOrDeleteOther(index, obs) {
        let i = this.indexOf(obs);
        if (i !== undefined) {
            this.qubitObservables.splice(i, 1);
            return;
        }

        this.qubitObservables.splice(index, 0, obs);
    }

    /**
     * @param {!SurfaceQubitObservable} obs
     * @returns {undefined|!int}
     */
    indexOf(obs) {
        for (let i = 0; i < this.qubitObservables.length; i++) {
            if (obs.isEqualTo(this.qubitObservables[i])) {
                return i;
            }
        }
        return undefined;
    }
}

class SurfaceCodeObservableOverlay {
    /**
     * @param {!Array.<SurfaceMultiObservable>} observables
     */
    constructor(observables=[]) {
        this.observables = observables;
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!SurfaceCode} surface
     */
    draw(ctx, surface) {
        for (let e of this.observables) {
            e.draw(ctx, surface);
        }
    }

    /**
     * @returns {!SurfaceCodeObservableOverlay}
     */
    clone() {
        let r = new SurfaceCodeObservableOverlay();
        r.observables = this.observables.map(e => e.clone());
        return r;
    }
}

export {SurfaceQubitObservable, SurfaceCodeObservableOverlay, SurfaceMultiObservable}
