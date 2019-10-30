import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {Axis} from "src/sim/Axis.js";
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";

class ValleyCloserType extends Tool {
    constructor() {
        super('V');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'gray';
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
        if (i !== i2 || j !== j2) {
            return false;
        }
        if (args.surface.layout.isCheckQubit(i, j)) {
            return args.surface.layout.neighbors(i, j).length <= 1;
        }
        if (args.surface.layout.isDataQubit(i, j)) {
            return args.surface.layout.neighbors(i, j).length === 1;
        }
        return false;
    }

    drawHoverHint(ctx, args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'black';
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        if (args.surface.layout.isDataQubit(i, j)) {
            let ns = args.surface.layout.neighbors(i, j);
            let [x, y] = ns[0];
            let axis = Axis.zIf(args.surface.layout.isZCheckQubit(x, y, true, true));
            args.surface.measureAndConditionalToggle(
                [],
                [new SurfaceQubitObservable(i, j, axis)],
                [new SurfaceQubitObservable(i, j, axis.opposite())]);
        }
        args.surface.layout.holes[i][j] = true;
    }
}

let ValleyCloser = new ValleyCloserType();

export {ValleyCloser}
