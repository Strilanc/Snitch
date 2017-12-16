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

class HoleDraggerType extends Tool {
    constructor() {
        super('D');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w/2, h/2);

        ctx.strokeStyle = axis.isX() ? config.xBorderColor : config.zBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w/2, h/2);

        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w*0.25, h*0.25);
        ctx.lineTo(w, h);
        ctx.lineTo(w, h*0.5);
        ctx.moveTo(w, h);
        ctx.lineTo(w*0.5, h);
        ctx.stroke();
    }

    canApply(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos !== undefined &&
            args.mouseButton === 0 &&
            args.surface.layout.isHole(Math.floor(args.dragStartPos[0]), Math.floor(args.dragStartPos[1]));
    }

    canHoverHint(args) {
        return false;
    }

    drawHoverHint(ctx, args) {
        // let i = Math.floor(args.mousePos[0]);
        // let j = Math.floor(args.mousePos[1]);
        // ctx.strokeStyle = '#000';
        // ctx.lineWidth = 3;
        // ctx.strokeRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
    }

    /**
     * @param {!ToolEffectArgs} args
     * @returns {!{
     *     i: !int,
     *     j: !int,
     *     di: !int,
     *     dj: !int,
     *     startArea: !Array.<![!int, !int]>,
     *     endArea: !Array.<![!int, !int]>}
     * }
     * @private
     */
    _argsToUseful(args) {
        let i = Math.floor(args.dragStartPos[0]);
        let j = Math.floor(args.dragStartPos[1]);
        let di = roundWithDeadZone(args.mousePos[0] - i - 0.5, 0.5, 2);
        let dj = roundWithDeadZone(args.mousePos[1] - j - 0.5, 0.5, 2);
        if (Math.abs(di) > Math.abs(dj)) {
            dj = 0;
        } else {
            di = 0;
        }

        let startArea = args.surface.layout.holeFloodFill(i, j);
        let endArea = startArea.
            map(([x, y]) => [x + di, y + dj]).
            filter(([x, y]) => args.surface.layout.isInBounds(x, y));
        return {
            i,
            j,
            di,
            dj,
            startArea,
            endArea
        };
    }

    drawPreview(ctx, args) {
        let {startArea, endArea} = this._argsToUseful(args);

        ctx.fillStyle = '#800';
        for (let [i, j] of startArea) {
            ctx.fillRect(
                (i + 0.3) * config.diam + 0.5,
                (j + 0.3) * config.diam + 0.5,
                config.diam * 0.4,
                config.diam * 0.4);
        }

        ctx.fillStyle = config.holeColor;
        for (let [i, j] of endArea) {
            ctx.fillRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
        }
    }

    applyEffect(args) {
        let {startArea, endArea} = this._argsToUseful(args);
        for (let [i, j] of startArea) {
            args.surface.layout.holes[i][j] = false;
        }
        for (let [i, j] of endArea) {
            args.surface.layout.holes[i][j] = true;
        }
    }
}

let HoleDragger = new HoleDraggerType();

export {HoleDragger}
