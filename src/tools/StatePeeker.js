import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {Axis} from "src/sim/Util.js";
import {ObservableProduct} from "src/sim/ObservableProduct.js";
import {SurfaceMultiObservable, SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";

class StatePeekerType extends Tool {
    constructor() {
        super('M');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/2, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/4, 0, Math.PI*2);
        ctx.fillStyle = 'black';
        ctx.fill();
    }

    canApply(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos !== undefined &&
            args.mouseButton === 0;
    }

    canHoverHint(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos === undefined &&
            args.mouseButton === undefined &&
            (args.surface.layout.isDataQubit(...args.surface.layout.nearestDataCoord(...args.mousePos)) ||
            args.surface.layout.isHole(Math.floor(args.mousePos[0]), Math.floor(args.mousePos[1])));
    }

    drawHoverHint(ctx, args) {
        {
            let i = Math.floor(args.mousePos[0]);
            let j = Math.floor(args.mousePos[1]);
            if (args.surface.layout.isHole(i, j)) {
                this._drawPreviewLoop(ctx, args);
                return;
            }
        }

        // Show state of qubit stabilizer observables.
        // let [i, j] = args.surface.layout.nearestDataCoord(...args.mousePos);
        // let q = args.surface.state.qubitMap.get(args.surface.qubits[i][j]);
        // ctx.strokeStyle = '#000';
        // ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
        // ctx.strokeStyle = '#000';
        // ctx.fillStyle = '#FFF';
        // ctx.textBaseline = 'middle';
        // ctx.font = '12pt monospace';
        // ctx.globalAlpha = 1.0;
        // let xs = q.obsX.toString(5);
        // let zs = q.obsZ.toString(5);
        // let w = Math.max(ctx.measureText(xs).width, ctx.measureText(zs).width);
        // ctx.strokeRect((i+1) * config.diam + 0.5, j * config.diam + 0.5, w + 6, config.diam*2);
        // ctx.fillRect((i+1) * config.diam + 0.5, j * config.diam + 0.5, w + 6, config.diam*2);
        // ctx.fillStyle = '#000';
        // ctx.fillText(xs, (i+1)*config.diam+3, (j+0.5)*config.diam);
        // ctx.fillText(zs, (i+1)*config.diam+3, (j+1.5)*config.diam);
    }

    _drawPreviewPath(ctx, args) {
        let axis = Axis.zIf(!args.shiftKey);
        let [i1, j1] = args.surface.layout.nearestCheckCoord(args.dragStartPos[0], args.dragStartPos[1], axis);
        let [i2, j2] = args.surface.layout.nearestCheckCoord(args.mousePos[0], args.mousePos[1], axis);
        let pathData = args.surface.layout.pathAlongCheckQubits(i1, j1, i2, j2, false);
        let pathCheck = args.surface.layout.pathAlongCheckQubits(i1, j1, i2, j2, true);
        let x = new ObservableProduct();
        let z = new ObservableProduct();
        ctx.fillStyle = axis.isX() ? config.xOnColor : config.zOnColor;
        for (let [i, j] of pathData) {
            if (args.surface.layout.isDataQubit(i, j)) {
                let q = args.surface.state.qubitMap.get(args.surface.qubits[i][j]);
                x.inline_times(q.obsX);
                z.inline_times(q.obsZ);
                ctx.fillRect((i + 0.3) * config.diam, (j + 0.3) * config.diam, 0.4 * config.diam, 0.4 * config.diam);
            }
        }
        ctx.beginPath();
        ctx.moveTo((pathCheck[0] + 0.5) * config.diam, (pathCheck[1] + 0.5) * config.diam);
        for (let [i, j] of pathCheck) {
            ctx.lineTo((i + 0.5) * config.diam, (j + 0.5) * config.diam);
            ctx.fillRect((i + 0.3) * config.diam, (j + 0.3) * config.diam, 0.4 * config.diam, 0.4 * config.diam);
        }
        ctx.strokeStyle = axis.isX() ? config.xOnColor : config.zOnColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#FFF';
        ctx.textBaseline = 'middle';
        ctx.font = '12pt monospace';
        ctx.globalAlpha = 0.5;
        let xs = x.toString(5);
        let zs = z.toString(5);
        let w = Math.max(ctx.measureText(xs).width, ctx.measureText(zs).width);
        ctx.strokeRect((i2 + 1) * config.diam + 0.5, j2 * config.diam + 0.5, w + 6, config.diam * 2);
        ctx.fillRect((i2 + 1) * config.diam + 0.5, j2 * config.diam + 0.5, w + 6, config.diam * 2);
        ctx.fillStyle = '#000';
        ctx.fillText(xs, (i2 + 1) * config.diam + 3, (j2 + 0.5) * config.diam);
        ctx.fillText(zs, (i2 + 1) * config.diam + 3, (j2 + 1.5) * config.diam);
    }

    /**
     * @param {!ToolEffectArgs} args
     * @returns {undefined|!SurfaceMultiObservable}
     */
    _holePointToObservable(args) {
        let closest = args.surface.layout.nearestBorderLocFromPointInHole(...args.mousePos);
        if (closest === undefined) {
            return undefined;
        }

        let border = args.surface.layout.fullContiguousBorderTouching(closest);
        if (border === undefined) {
            return undefined;
        }

        let {axis, locs} = border;
        let obs = new SurfaceMultiObservable();
        if (args.shiftKey) {
            axis = axis.opposite();
        }
        for (let loc of locs) {
            if (args.surface.layout.isDataQubit(loc.i, loc.j)) {
                obs.insertOrDeleteOther(0, new SurfaceQubitObservable(loc.i, loc.j, axis));
            }
        }
        if (obs.qubitObservables.length === 0) {
            return undefined;
        }
        return obs;
    }


    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!ToolEffectArgs} args
     */
    _drawPreviewLoop(ctx, args) {
        let obs = this._holePointToObservable(args);
        if (obs !== undefined) {
            obs.draw(ctx, args.surface);
        }
    }

    drawPreview(ctx, args) {
        let i = Math.floor(args.dragStartPos[0]);
        let j = Math.floor(args.dragStartPos[1]);
        let i2 = Math.floor(args.mousePos[0]);
        let j2 = Math.floor(args.mousePos[1]);

        if (i === i2 && j === j2 && args.surface.layout.isHole(i, j)) {
            this._drawPreviewLoop(ctx, args);
        } else {
            this._drawPreviewPath(ctx, args);
        }
    }

    /**
     * @param {!ToolEffectArgs} args
     * @private
     */
    _applyEffectPath(args) {
        let axis = Axis.zIf(!args.shiftKey);
        let [i1, j1] = args.surface.layout.nearestCheckCoord(args.dragStartPos[0], args.dragStartPos[1], axis);
        let [i2, j2] = args.surface.layout.nearestCheckCoord(args.mousePos[0], args.mousePos[1], axis);
        let pathData = args.surface.layout.pathAlongCheckQubits(i1, j1, i2, j2, false);
        let obs = new SurfaceMultiObservable();
        for (let [i, j] of pathData) {
            if (args.surface.layout.isDataQubit(i, j)) {
                obs.qubitObservables.push(new SurfaceQubitObservable(i, j, axis.opposite()));
            }
        }
        if (obs.qubitObservables.length > 0) {
            args.surface.observableOverlay.observables.push(obs);
        }
    }

    /**
     * @param {!ToolEffectArgs} args
     * @private
     */
    _applyEffectLoop(args) {
        let obs = this._holePointToObservable(args);
        if (obs !== undefined) {
            args.surface.observableOverlay.observables.push(obs);
        }
    }

    applyEffect(args) {
        let i = Math.floor(args.dragStartPos[0]);
        let j = Math.floor(args.dragStartPos[1]);
        let i2 = Math.floor(args.mousePos[0]);
        let j2 = Math.floor(args.mousePos[1]);

        if (i === i2 && j === j2 && args.surface.layout.isHole(i, j)) {
            this._applyEffectLoop(args);
        } else {
            this._applyEffectPath(args);
        }
    }
}

let StatePeeker = new StatePeekerType();

export {StatePeeker}
