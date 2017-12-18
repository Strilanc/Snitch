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
        if (i !== i2 ||
                j !== j2 ||
                !args.surface.layout.isHole(i, j) ||
                !args.surface.layout.isCheckQubit(i, j, undefined, true, false)) {
            return false;
        }

        let holes = args.surface.layout.neighbors(i, j, true, true).
            filter(pt => args.surface.layout.isHole(...pt) &&
                    args.surface.layout.isDataQubit(pt[0], pt[1], true, false));
        return holes.length === 1;
    }

    canHoverHint(args) {
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.endPos);
        if (!args.surface.layout.isHole(i, j) ||
            !args.surface.layout.isCheckQubit(i, j, undefined, true, false)) {
            return false;
        }

        let holes = args.surface.layout.neighbors(i, j, true, true).
            filter(pt => args.surface.layout.isHole(...pt) &&
                    args.surface.layout.isDataQubit(pt[0], pt[1], true, false));
        return holes.length === 1;
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
        let [x, y] = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt))[0];

        args.surface.layout.holes[i][j] = false;
        args.surface.layout.holes[x][y] = false;
        let axis = Axis.zIf(args.surface.layout.isZCheckQubit(i, j));
        args.surface.reset(x, y, axis.opposite(), false);

        args.surface.measureAndConditionalToggle(
            [[i, j]],
            [],
            [new SurfaceQubitObservable(x, y, axis.opposite())]
        );
    }
}

let HoleRetracter = new HoleRetracterType();

export {HoleRetracter}
