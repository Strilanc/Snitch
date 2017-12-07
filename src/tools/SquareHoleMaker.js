/**
 * Implements an effect that can be applied to a surface code grid.
 */
import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";

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

function inRect(x, y, w, h, i, j) {
    return i >= x && i < x + w && j >= y && j < y + h;
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

function* area(x, y, w, h, pad=0) {
    for (let i = -pad; i < w + pad; i++) {
        for (let j = -pad; j < h + pad; j++) {
            yield [i + x, j + y];
        }
    }
}

class SquareHoleMakerType extends Tool {
    canApply(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos !== undefined &&
            !args.ctrlKey &&
            args.mouseButton === 0 &&
            args.surface.layout.isCheckQubit(Math.floor(args.dragStartPos[0]), Math.floor(args.dragStartPos[1]));
    }

    canHoverHint(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos === undefined &&
            !args.ctrlKey &&
            args.mouseButton === undefined &&
            args.surface.layout.isCheckQubit(Math.floor(args.mousePos[0]), Math.floor(args.mousePos[1]));
    }

    drawHoverHint(ctx, args) {
        let i = Math.floor(args.mousePos[0]);
        let j = Math.floor(args.mousePos[1]);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
    }

    /**
     * @param {!ToolEffectArgs} args
     * @returns {!{i: !int, j: !int, w: !int, h: !int}}
     * @private
     */
    _argsToRect(args) {
        let i1 = Math.floor(args.dragStartPos[0]);
        let j1 = Math.floor(args.dragStartPos[1]);
        let i2 = roundWithDeadZone(args.mousePos[0] - i1 - 0.5, 0.5, 2) + i1;
        let j2 = roundWithDeadZone(args.mousePos[1] - j1 - 0.5, 0.5, 2) + j1;
        return {
            i: Math.min(i1, i2),
            j: Math.min(j1, j2),
            w: Math.abs(i2 - i1) + 1,
            h: Math.abs(j2 - j1) + 1
        };
    }

    drawPreview(ctx, args) {
        let {i: x, j: y, w, h} = this._argsToRect(args);

        ctx.fillStyle = config.holeColor;
        ctx.fillRect(x * config.diam + 0.5, y * config.diam + 0.5, w * config.diam, h * config.diam);
        let overlay = (i5, j5) => inRect(x, y, w, h, i5, j5);
        for (let [i, j] of border(x, y, w, h)) {
            if (args.surface.layout.isDataQubit(i, j) && args.surface.shouldBeHole(i, j, overlay).shouldBeHole) {
                ctx.fillRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
            }
        }
    }

    applyEffect(args) {
        let {i: x, j: y, w, h} = this._argsToRect(args);

        for (let [i, j] of area(x, y, w, h)) {
            if (args.surface.layout.isCheckQubit(i, j)) {
                args.surface.layout.holes[i][j] = true;
            }
        }

        for (let [i, j] of area(x, y, w, h, 1)) {
            args.surface.updateDataHoleBasedOnNeighbors(i, j);
        }

        for (let [i, j] of area(x, y, w, h, 1)) {
            args.surface.updateDataHoleBasedOnNeighbors(i, j);
        }
    }
}

let SquareHoleMaker = new SquareHoleMakerType();

export {SquareHoleMaker}
