import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";
import {CARDINALS} from "src/sim/Util.js";
import {BorderLoc} from "src/sim/SurfaceCodeLayout.js";

/**
 * @param {!SurfaceCodeLayout} layout
 * @param {!number} x
 * @param {!number} y
 * @returns {undefined|!{boundary: Array.<![!int, !int]>, normal: ![!int, !int]}}
 */
function nearestBorder(layout, x, y) {
    let i = Math.floor(x);
    let j = Math.floor(y);
    let bestDistance = Infinity;
    let bestDir = undefined;
    for (let [di, dj] of CARDINALS) {
        if (layout.borderType(new BorderLoc(i, j, di, dj)) !== undefined) {
            let dx = Math.abs((x - i - 0.5 - di*0.5)*di);
            let dy = Math.abs((y - j - 0.5 - dj*0.5)*dj);
            let d = dx + dy;
            if (d < bestDistance) {
                bestDistance = d;
                bestDir = [di, dj];
            }
        }
    }

    if (bestDir === undefined) {
        return undefined;
    }
    let [di, dj] = bestDir;

    if (!layout.isHole(i, j)) {
        i += di;
        j += dj;
        di *= -1;
        dj *= -1;
    }

    while (layout.isHole(i, j) && !layout.isHole(i + di, j + dj)) {
        i += dj;
        j -= di;
    }
    i -= dj;
    j += di;

    let boundary = [];
    while (layout.isHole(i, j) && !layout.isHole(i + di, j + dj)) {
        boundary.push([i, j]);
        i -= dj;
        j += di;
    }

    return {boundary, normal: [di, dj]};
}

class HoleResizerType extends Tool {
    constructor() {
        super('R');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w/2, h);

        ctx.strokeStyle = axis.isX() ? config.xBorderColor : config.zBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w/2, h);

        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w*0.55, h*0.25);
        ctx.lineTo(w*0.55, h*0.75);
        ctx.moveTo(w*0.55, h*0.5);
        ctx.lineTo(w, h*0.5);
        ctx.lineTo(w*0.75, h*0.25);
        ctx.moveTo(w, h*0.5);
        ctx.lineTo(w*0.75, h*0.75);
        ctx.stroke();
    }

    canApply(args) {
        return args.dragStartPos !== undefined && args.mousePos !== undefined && args.mouseButton === 0;
    }

    canHoverHint(args) {
        return args.dragStartPos === undefined && args.mousePos !== undefined && args.mouseButton === undefined;
    }

    drawHoverHint(ctx, args) {
        let border = nearestBorder(args.surface.layout, ...args.mousePos);
        if (border === undefined) {
            return;
        }
        let {boundary, normal: [di, dj]} = border;
        args.mousePointerOut = di !== 0 ? 'col-resize' : 'row-resize';
        let pi = dj;
        let pj = -di;

        ctx.beginPath();
        let [i1, j1] = boundary[0];
        let [i2, j2] = boundary[boundary.length - 1];
        let x1 = (i1 + 0.5 + di*0.5 + pi*0.5)*config.diam;
        let y1 = (j1 + 0.5 + dj*0.5 + pj*0.5)*config.diam;
        let x2 = (i2 + 0.5 + di*0.5 - pi*0.5)*config.diam;
        let y2 = (j2 + 0.5 + dj*0.5 - pj*0.5)*config.diam;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'red';
        ctx.stroke();
    }

    drawPreview(ctx, args) {
        let border = nearestBorder(args.surface.layout, ...args.dragStartPos);
        if (border === undefined) {
            return;
        }
        let {boundary, normal: [di, dj]} = border;
        args.mousePointerOut = di !== 0 ? 'col-resize' : 'row-resize';

        let dx = args.mousePos[0] - args.dragStartPos[0];
        let dy = args.mousePos[1] - args.dragStartPos[1];
        let dMax = (Math.round(dx / 2) * di + Math.round(dy / 2) * dj) * 2;

        if (dMax < 0) {
            return;
        }
        let d = 0;
        while (d < dMax) {
            if (!boundary.every(([i, j]) => !args.surface.layout.isHole(i + d*di + di, j + d*dj + dj))) {
                break;
            }
            if (!boundary.every(([i, j]) => !args.surface.layout.isHole(i + d*di + di*2, j + d*dj + dj*2))) {
                break;
            }
            d += 2;
        }

        let pi = dj;
        let pj = -di;

        ctx.beginPath();
        let [i1, j1] = boundary[0];
        let [i2, j2] = boundary[boundary.length - 1];
        let x1 = (i1 + 0.5 + di*0.5 + pi*0.5)*config.diam;
        let y1 = (j1 + 0.5 + dj*0.5 + pj*0.5)*config.diam;
        let x2 = (i2 + 0.5 + di*0.5 - pi*0.5)*config.diam;
        let y2 = (j2 + 0.5 + dj*0.5 - pj*0.5)*config.diam;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 + d*di*config.diam, y2 + d*dj*config.diam);
        ctx.lineTo(x1 + d*di*config.diam, y1 + d*dj*config.diam);
        ctx.lineTo(x1, y1);
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'red';
        ctx.stroke();
        ctx.fillStyle = 'black';
        ctx.fill();
    }

    applyEffect(args) {
        let border = nearestBorder(args.surface.layout, ...args.dragStartPos);
        if (border === undefined) {
            return;
        }
        let {boundary, normal: [di, dj]} = border;

        let dx = args.mousePos[0] - args.dragStartPos[0];
        let dy = args.mousePos[1] - args.dragStartPos[1];
        let dMax = (Math.round(dx / 2) * di + Math.round(dy / 2) * dj) * 2;

        if (dMax < 0) {
            return;
        }
        let d = 0;
        while (d < dMax) {
            if (!boundary.every(([i, j]) => !args.surface.layout.isHole(i + d*di + di, j + d*dj + dj))) {
                break;
            }
            if (!boundary.every(([i, j]) => !args.surface.layout.isHole(i + d*di + di*2, j + d*dj + dj*2))) {
                break;
            }
            let d1 = d + 1;
            let d2 = d + 2;
            for (let [i, j] of boundary) {
                args.surface.extendHole(i + di*d2, j + dj*d2);
            }
            for (let [i, j] of boundary) {
                args.surface.extendHole(i + di*d1, j + dj*d1);
            }
            d += 2;
        }

        // TODO: also shrink holes
        // TODO: prevent side merging
        // TODO: when expanding an inside edge past an outside edge, avoid creating opposite type hole in extension
    }
}

let HoleResizer = new HoleResizerType();

export {HoleResizer}
