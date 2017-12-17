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
        this._drawPath(ctx, args, args.mousePos);
    }

    _drawPath(ctx, args, pt) {
        let r = args.surface.layout.mouseSegmentToDataQubits(
            pt[0],
            pt[1],
            args.mousePos[0],
            args.mousePos[1]);

        ctx.fillStyle = '#800';
        for (let [x, y] of r.anchorPoints) {
            ctx.fillRect((x - 0.2) * config.diam, (y - 0.2) * config.diam, config.diam * 0.4, config.diam * 0.4);
        }

        ctx.strokeStyle = '#000';
        ctx.strokeRect((r.anchorPoints[0][0]-0.5)*config.diam, (r.anchorPoints[0][1]-0.5)*config.diam,
            config.diam, config.diam);

        let axis = r.pathType.opposite();
        if (r.path !== undefined) {
            let obs = new SurfaceMultiObservable(r.path.map(([i, j]) => new SurfaceQubitObservable(i, j, axis)));
            obs.draw(ctx, args.surface);
        } else {
            ctx.beginPath();
            ctx.moveTo(r.anchorPoints[0][0]*config.diam, r.anchorPoints[0][1]*config.diam);
            ctx.lineTo(r.anchorPoints[1][0]*config.diam, r.anchorPoints[1][1]*config.diam);
            ctx.strokeStyle = 'red';
            //noinspection JSUnresolvedFunction
            ctx.setLineDash([8, 4]);
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }

    drawPreview(ctx, args) {
        ctx.globalAlpha = 1 - 0.5*(1 - ctx.globalAlpha);
        this._drawPath(ctx, args, args.dragStartPos);
    }

    applyEffect(args) {
        let r = args.surface.layout.mouseSegmentToDataQubits(
            args.dragStartPos[0],
            args.dragStartPos[1],
            args.mousePos[0],
            args.mousePos[1]);
        let axis = r.pathType.opposite();
        if (r.path !== undefined) {
            let obs = new SurfaceMultiObservable(r.path.map(([i, j]) => new SurfaceQubitObservable(i, j, axis)));
            args.surface.observableOverlay.observables.push(obs);
        }
    }
}

let StatePeeker = new StatePeekerType();

export {StatePeeker}
