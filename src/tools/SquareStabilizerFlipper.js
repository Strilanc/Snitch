/**
 * Implements an effect that can be applied to a surface code grid.
 */
import {config} from "src/config.js"
import {strokeErrorCurveAt} from "src/draw/Common.js";
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";
import {Axis, X_AXIS} from "src/sim/Util.js";

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

function* border(x, y, w, h) {
    for (let i = 0; i < w; i++) {
        yield [x + i, y - 1];
        yield [x + i, y + h];
    }
    for (let j = 0; j < h; j++) {
        yield [x - 1, y + j];
        yield [x + w, y + j];
    }
}

class SquareStabilizerFlipperType extends Tool {
    canApply(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos !== undefined &&
            args.ctrlKey &&
            args.mouseButton === 0 &&
            args.surface.layout.isCheckQubit(Math.floor(args.dragStartPos[0]), Math.floor(args.dragStartPos[1]));
    }

    canHoverHint(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos === undefined &&
            args.ctrlKey &&
            args.mouseButton === undefined &&
            args.surface.layout.isCheckQubit(Math.floor(args.mousePos[0]), Math.floor(args.mousePos[1]));
    }

    drawHoverHint(ctx, args) {
        let x = Math.floor(args.mousePos[0]);
        let y = Math.floor(args.mousePos[1]);
        let axis = Axis.xz(args.surface.layout.isCheckQubit(x, y, X_AXIS, true));

        ctx.beginPath();
        for (let [i, j] of border(x, y, 1, 1)) {
            if (args.surface.layout.isDataQubit(i, j)) {
                strokeErrorCurveAt(ctx, args.surface, i, j, axis);
            }
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
        let i1 = Math.floor(args.dragStartPos[0]);
        let j1 = Math.floor(args.dragStartPos[1]);
        let i2 = roundWithDeadZone(args.mousePos[0] - i1 - 0.5, 0.5, 2) + i1;
        let j2 = roundWithDeadZone(args.mousePos[1] - j1 - 0.5, 0.5, 2) + j1;
        let i = Math.min(i1, i2);
        let j = Math.min(j1, j2);
        let axis = Axis.xz(args.surface.layout.isCheckQubit(i, j, X_AXIS, true));
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
        for (let [i, j] of border(x, y, w, h)) {
            if (args.surface.layout.isDataQubit(i, j)) {
                strokeErrorCurveAt(ctx, args.surface, i, j, axis);
            }
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

        for (let [i, j] of border(x, y, w, h)) {
            if (args.surface.layout.isDataQubit(i, j)) {
                args.surface.doXZ(i, j, axis.isZ());
            }
        }
    }
}

let SquareStabilizerFlipper = new SquareStabilizerFlipperType();

export {SquareStabilizerFlipper}
