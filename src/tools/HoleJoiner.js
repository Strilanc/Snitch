import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";
import {BorderLoc} from "src/sim/SurfaceCodeLayout.js";
import {Axis} from "src/sim/Axis.js";

class HoleJoinerType extends Tool {
    constructor() {
        super('L');
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
        let [i, j] = args.surface.layout.nearestDataCoord(...args.startPos);
        let [i2, j2] = args.surface.layout.nearestDataCoord(...args.endPos);
        if (i !== i2 || j !== j2 || !args.surface.layout.isDataQubit(i, j)) {
            return false;
        }
        return args.surface.canJoinBorders(i, j, Axis.X) || args.surface.canJoinBorders(i, j, Axis.Z);
    }

    canHoverHint(args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.endPos);
        if (!args.surface.layout.isDataQubit(i, j)) {
            return false;
        }
        return args.surface.canJoinBorders(i, j, Axis.X) || args.surface.canJoinBorders(i, j, Axis.Z);
    }

    drawHoverHint(ctx, args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.endPos);
        let [[x1, y1], [x2, y2]] = args.surface.layout.neighbors(i, j, true, true).
            filter(pt => args.surface.layout.isHole(...pt));
        ctx.fillStyle = 'black';
        ctx.strokeStyle = args.surface.layout.isSameHole(x1, y1, x2, y2) ? 'black' : 'red';
        ctx.lineWidth = 2;
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.endPos);
        for (let axis of Axis.XZ) {
            args.surface.joinBorders(i, j, axis);
        }
    }
}

let HoleJoiner = new HoleJoinerType();

export {HoleJoiner}
