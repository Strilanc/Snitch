import {config} from "src/config.js"
import {strokeErrorCurveAt} from "src/draw/Common.js";
import {Tool} from "src/tools/Tool.js"
import {Axis} from "src/sim/Axis.js";
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";

class ObservableStabilizerFlipperType extends Tool {
    constructor() {
        super('O');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.strokeStyle = axis.isX() ? config.xOnColor : config.zOnColor;
        //noinspection JSUnresolvedFunction
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, w, h);

        ctx.beginPath();
        ctx.arc(w/2, h/2, w/4, 0, Math.PI*2);
        ctx.fillStyle = 'black';
        ctx.fill();
    }

    canApply(args) {
        return args.mouseButton === 0 &&
            args.surface.layout.isCheckQubit(...args.surface.layout.nearestCheckCoord(
                args.endPos[0],
                args.endPos[1],
                Axis.zIf(args.shiftKey)));
    }

    canHoverHint(args) {
        return args.surface.layout.isCheckQubit(...args.surface.layout.nearestCheckCoord(
                args.endPos[0],
                args.endPos[1],
                Axis.zIf(args.shiftKey)));
    }

    drawHoverHint(ctx, args) {
        let axis = Axis.zIf(!args.shiftKey);
        let [x, y] = args.surface.layout.nearestCheckCoord(
            args.endPos[0],
            args.endPos[1],
            axis.opposite());

        let matches = [];
        for (let [i, j] of args.surface.layout.neighbors(x, y)) {
            matches.push(new SurfaceQubitObservable(i, j, axis.opposite()));
        }

        let relevantObservables = args.surface.observableOverlay.observables.
            filter(obs => !matches.every(e => obs.indexOf(e) === undefined));
        if (relevantObservables.length > 0) {
            ctx.beginPath();
            for (let [i, j] of args.surface.layout.neighbors(x, y)) {
                strokeErrorCurveAt(ctx, args.surface, i, j, axis);
            }
            ctx.strokeStyle = '#800';
            ctx.stroke();
            ctx.strokeStyle = axis.isZ() ? config.zOnColor : config.xOnColor;
            //noinspection JSUnresolvedFunction
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let axis = Axis.zIf(!args.shiftKey);
        let [x, y] = args.surface.layout.nearestCheckCoord(
            args.endPos[0],
            args.endPos[1],
            axis.opposite());

        let matches = [];
        for (let [i, j] of args.surface.layout.neighbors(x, y)) {
            matches.push(new SurfaceQubitObservable(i, j, axis.opposite()));
        }

        let relevantObservables = args.surface.observableOverlay.observables.
            filter(obs => !matches.every(e => obs.indexOf(e) === undefined));
        for (let obs of relevantObservables) {
            for (let m of matches) {
                obs.insertOrDeleteOther(0, m);
            }
        }
    }
}

let ObservableStabilizerFlipper = new ObservableStabilizerFlipperType();

export {ObservableStabilizerFlipper}
