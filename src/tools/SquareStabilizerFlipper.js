import {config} from "src/config.js"
import {strokeErrorCurveAt} from "src/draw/Common.js";
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";
import {Axis, X_AXIS, makeGrid} from "src/sim/Util.js";

function roundWithDeadZone(v, d, r) {
    let s = v < 0 ? -1 : +1;
    v *= s;
    if (v < d) {
        return 0;
    }
    v -= d;
    v /= r;
    return Math.round(v) * r * s;
}

/**
 * @param {!SurfaceCode} surface
 * @param {!int} x
 * @param {!int} y
 * @param {!int} w
 * @param {!int} h
 * @param {!Axis} axis
 */
function* flippedByStabilizersInRect(surface, x, y, w, h, axis) {
    let activated = makeGrid(surface.layout.width, surface.layout.height, () => false);

    for (let di = 0; di < w; di++) {
        for (let dj = 0; dj < h; dj++) {
            if (surface.layout.isCheckQubit(x + di, y + dj, axis)) {
                for (let [i2, j2] of surface.layout.neighbors(x + di, y + dj)) {
                    activated[i2][j2] = !activated[i2][j2];
                }
            }
        }
    }

    for (let i = 0; i < surface.layout.width; i++) {
        for (let j = 0; j < surface.layout.height; j++) {
            if (activated[i][j]) {
                yield [i, j];
            }
        }
    }
}

class SquareStabilizerFlipperType extends Tool {
    constructor() {
        super('S');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.strokeStyle = axis.isX() ? config.xOnColor : config.zOnColor;
        //noinspection JSUnresolvedFunction
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
    }

    canApply(args) {
        return args.mouseButton === 0 &&
            args.surface.layout.isCheckQubit(...args.surface.layout.nearestCheckCoord(
                args.startPos[0],
                args.startPos[1],
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

        ctx.beginPath();
        for (let [i, j] of flippedByStabilizersInRect(args.surface, x, y, 1, 1, axis.opposite())) {
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

    /**
     * @param {!ToolEffectArgs} args
     * @returns {!{i: !int, j: !int, w: !int, h: !int, axis: !Axis}}
     * @private
     */
    argsToUseful(args) {
        let axis = Axis.zIf(!args.shiftKey);
        let [i1, j1] = args.surface.layout.nearestCheckCoord(
            args.startPos[0],
            args.startPos[1],
            axis.opposite());
        let i2 = roundWithDeadZone(args.endPos[0] - i1 - 0.5, 0.5, 2) + i1;
        let j2 = roundWithDeadZone(args.endPos[1] - j1 - 0.5, 0.5, 2) + j1;
        let i = Math.min(i1, i2);
        let j = Math.min(j1, j2);
        return {
            controlPoints: [[i1, j1], [i2, j2]],
            i,
            j,
            w: Math.abs(i2 - i1) + 1,
            h: Math.abs(j2 - j1) + 1,
            axis
        };
    }

    drawPreview(ctx, args) {
        let {i: x, j: y, controlPoints, w, h, axis} = this.argsToUseful(args);

        ctx.beginPath();
        for (let [i, j] of flippedByStabilizersInRect(args.surface, x, y, w, h, axis.opposite())) {
            strokeErrorCurveAt(ctx, args.surface, i, j, axis);
        }

        ctx.strokeStyle = '#800';
        ctx.stroke();
        ctx.strokeStyle = axis.isZ() ? config.zOnColor : config.xOnColor;
        //noinspection JSUnresolvedFunction
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#800';
        for (let [i, j] of controlPoints) {
            ctx.fillRect(
                (Math.floor(i) + 0.3) * config.diam,
                (Math.floor(j) + 0.3) * config.diam,
                config.diam * 0.4,
                config.diam * 0.4);
        }
    }

    applyEffect(args) {
        let {i: x, j: y, w, h, axis} = this.argsToUseful(args);

        for (let [i, j] of flippedByStabilizersInRect(args.surface, x, y, w, h, axis.opposite())) {
            args.surface.errorOverlay.flipQubit(i, j, axis.opposite());
        }
    }
}

let SquareStabilizerFlipper = new SquareStabilizerFlipperType();

export {SquareStabilizerFlipper}
