import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";
import {Axis} from "src/sim/Util.js";
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";

class HoleRetracterType extends Tool {
    constructor() {
        super('Z');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w/4, h);

        ctx.strokeStyle = axis.isX() ? config.xBorderColor : config.zBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w/4, h);

        ctx.fillStyle = 'red';
        ctx.fillRect(w/8, h/3, w*7/8, h/3);
    }

    canApply(args) {
        if (args.mouseButton !== 0) {
            return false;
        }
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.startPos);
        let [i2, j2] = args.surface.layout.nearestCheckCoord(...args.endPos);
        return i === i2 && j === j2 && args.surface.canRetractPole(i, j);
    }

    canHoverHint(args) {
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.endPos);
        return args.surface.canRetractPole(i, j);
    }

    drawHoverHint(ctx, args) {
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.endPos);
        let [x, y] = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt))[0];
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.fillRect(x*config.diam, y*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.endPos);
        args.surface.retractPole(i, j);
    }
}

let HoleRetracter = new HoleRetracterType();

export {HoleRetracter}
