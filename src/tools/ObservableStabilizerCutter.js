import {config} from "src/config.js"
import {strokeErrorCurveAt} from "src/draw/Common.js";
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";
import {Axis, X_AXIS, makeGrid} from "src/sim/Util.js";
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";

class ObservableStabilizerCutterType extends Tool {
    constructor() {
        super('F');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.strokeStyle = axis.isX() ? config.xOnColor : config.zOnColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);

        //noinspection JSUnresolvedFunction
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, w, h);
    }

    canApply(args) {
        return args.mouseButton === 0 &&
            args.surface.layout.isDataQubit(...args.surface.layout.nearestDataCoord(
                args.endPos[0],
                args.endPos[1]));
    }

    canHoverHint(args) {
        return args.surface.layout.isDataQubit(...args.surface.layout.nearestDataCoord(args.endPos[0], args.endPos[1]));
    }

    /**
     * @param {!SurfaceCode} surface
     * @param {!int} i
     * @param {!int} j
     * @param {!Axis} axis
     * @param {!SurfaceMultiObservable} multiObs
     * @private
     */
    _contiguousObservableSection(surface, i, j, axis, multiObs) {
        let flags = makeGrid(surface.layout.width, surface.layout.height, () => []);
        for (let obs of multiObs.qubitObservables) {
            if (obs.axis === axis) {
                for (let [i2, j2] of surface.layout.neighbors(obs.i, obs.j)) {
                    if (surface.layout.isCheckQubit(i2, j2, axis.opposite())) {
                        flags[i2][j2].push(obs);
                    }
                }
            }
        }

        let q = [[i, j]];
        while (q.length > 0) {
            let [x, y] = q.pop();
            if (flags[x][y] === true) {
                continue;
            }
            flags[x][y] = true;
            for (let [i2, j2] of surface.layout.neighbors(x, y)) {
                for (let obs of flags[i2][j2]) {
                    q.push([obs.i, obs.j]);
                }
            }
        }

        let results = [];
        for (let i = 0; i < surface.layout.width; i++) {
            for (let j = 0; j < surface.layout.height; j++) {
                if (flags[i][j] === true) {
                    results.push(new SurfaceQubitObservable(i, j, axis));
                }
            }
        }
        return results;
    }

    drawHoverHint(ctx, args) {
        let axis = Axis.zIf(!args.shiftKey);
        let [x, y] = args.surface.layout.nearestDataCoord(
            args.endPos[0],
            args.endPos[1]);

        ctx.strokeStyle = 'red';
        ctx.strokeRect(x*config.diam, y*config.diam, config.diam, config.diam);

        let relevantObservables = args.surface.observableOverlay.observables.
            filter(obs => obs.indexOf(new SurfaceQubitObservable(x, y, axis.opposite())) !== undefined);
        ctx.beginPath();
        for (let obs of relevantObservables) {
            for (let v of this._contiguousObservableSection(args.surface, x, y, axis.opposite(), obs)) {
                strokeErrorCurveAt(ctx, args.surface, v.i, v.j, axis);
            }
        }
        ctx.strokeStyle = '#800';
        ctx.lineWidth = 5;
        ctx.stroke();
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let axis = Axis.zIf(!args.shiftKey);
        let [x, y] = args.surface.layout.nearestDataCoord(
            args.endPos[0],
            args.endPos[1]);

        let relevantObservables = args.surface.observableOverlay.observables.
            filter(obs => obs.indexOf(new SurfaceQubitObservable(x, y, axis.opposite())) !== undefined);
        for (let obs of relevantObservables) {
            for (let v of this._contiguousObservableSection(args.surface, x, y, axis.opposite(), obs)) {
                obs.insertOrDeleteOther(0, v);
            }
        }
    }
}

let ObservableStabilizerCutter = new ObservableStabilizerCutterType();

export {ObservableStabilizerCutter}
