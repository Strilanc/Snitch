import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";
import {BorderLoc} from "src/sim/SurfaceCodeLayout.js";
import {Axis} from "src/sim/Axis.js";

class HoleDragJoinerType extends Tool {
    constructor() {
        super('J');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.strokeStyle = axis.isX() ? config.xBorderColor : config.zBorderColor;
        ctx.lineWidth = 2;
        ctx.fillRect(0, 0, w/4, h);
        ctx.strokeRect(0, 0, w/4, h);
        ctx.fillRect(w*3/4, 0, w/4, h);
        ctx.strokeRect(w*3/4, 0, w/4, h);

        ctx.fillStyle = 'gray';
        ctx.fillRect(w/8, h/3, w*3/4, h/3);
    }

    canApply(args) {
        if (args.mouseButton !== 0) {
            return false;
        }
        let b1 = args.surface.layout.nearestOutsideBorderLocFromPointInHole(
            args.startPos[0],
            args.startPos[1],
            false);
        if (b1 === undefined) {
            return false;
        }
        let axis = args.surface.layout.borderType(b1);
        let b2 = args.surface.layout.nearestOutsideBorderLocFromPointInHole(
            args.endPos[0],
            args.endPos[1],
            false);
        if (b2 === undefined || args.surface.layout.borderType(b2) !== axis) {
            return false;
        }
        if (args.surface.layout.areBorderLocsOnSameContiguousBorder(b1, b2)) {
            return false;
        }
        b1 = b1.backside();
        b2 = b2.backside();
        return args.surface.layout.pathAlongCheckQubits(b1.i, b1.j, b2.i, b2.j) !== undefined;
    }

    canHoverHint(args) {
        return true;
    }

    drawHoverHint(ctx, args) {
        let b = args.surface.layout.nearestOutsideBorderLocFromPointInHole(
            args.startPos[0],
            args.startPos[1],
            false);
        if (b !== undefined) {
            b = b.backside();
            ctx.fillStyle = 'red';
            ctx.fillRect(b.i*config.diam, b.j*config.diam, config.diam, config.diam);
        }
    }

    drawPreview(ctx, args) {
        let b1 = args.surface.layout.nearestOutsideBorderLocFromPointInHole(
            args.startPos[0],
            args.startPos[1],
            false).backside();
        let b2 = args.surface.layout.nearestOutsideBorderLocFromPointInHole(
            args.endPos[0],
            args.endPos[1],
            false).backside();
        let path = args.surface.layout.pathAlongCheckQubits(b1.i, b1.j, b2.i, b2.j);
        for (let [i, j] of [...path.checkQubits, ...path.dataQubits]) {
            ctx.fillStyle = 'red';
            ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        }
    }

    applyEffect(args) {
        let b2 = args.surface.layout.nearestOutsideBorderLocFromPointInHole(
            args.startPos[0],
            args.startPos[1],
            false).backside();
        let b1 = args.surface.layout.nearestOutsideBorderLocFromPointInHole(
            args.endPos[0],
            args.endPos[1],
            false).backside();
        let path = args.surface.layout.pathAlongCheckQubits(b1.i, b1.j, b2.i, b2.j);
        for (let [i, j] of path.dataQubits.slice(0, path.dataQubits.length - 1)) {
            if (!args.surface.extendPole(i, j)) {
                return;
            }
        }
        let last = path.dataQubits[path.dataQubits.length - 1];
        let axis = args.surface.layout.borderType(b1);
        args.surface.joinBorders(last[0], last[1], axis, b1.backside());
    }
}

let HoleDragJoiner = new HoleDragJoinerType();

export {HoleDragJoiner}
