import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {Axis} from "src/sim/Util.js";
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";

class ValleyOpenerType extends Tool {
    constructor() {
        super('W');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'red';
        ctx.fillRect(w/3, h/3, w*2/3, h/3);
    }

    canApply(args) {
        if (args.mouseButton !== 0) {
            return false;
        }
        return this.canHoverHint(args);
    }

    canHoverHint(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        let i2 = Math.floor(args.endPos[0]);
        let j2 = Math.floor(args.endPos[1]);
        if (i !== i2 || j !== j2 || !args.surface.layout.isHole(i, j)) {
            return false;
        }
        if (args.surface.layout.isCheckQubit(i, j, undefined, true)) {
            let ns = args.surface.layout.neighbors(i, j);
            if (ns.length === 0) {
                return true;
            }
            if (ns.length === 1) {
                let axis = args.surface.layout.checkAxis(i, j, true);
                return args.surface.layout.neighbors(ns[0][0], ns[0][1]).
                    every(([x, y]) => args.surface.layout.checkAxis(x, y, true) === axis);
            }
            return false;
        }
        if (args.surface.layout.isDataQubit(i, j, true)) {
            return args.surface.layout.neighbors(i, j).length === 1;
        }
        return false;
    }

    drawHoverHint(ctx, args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'red';
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        args.surface.layout.holes[i][j] = false;
        if (args.surface.layout.isDataQubit(i, j)) {
            let ns = args.surface.layout.neighbors(i, j);
            let [x, y] = ns[0];
            let axis = Axis.zIf(args.surface.layout.isZCheckQubit(x, y, true, true));
            args.surface.reset(i, j, axis);
            args.surface.measureAndConditionalToggle(
                [[x, y]],
                [],
                [new SurfaceQubitObservable(i, j, axis.opposite())]);
        }
    }
}

let ValleyOpener = new ValleyOpenerType();

export {ValleyOpener}
