import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {Axis} from "src/sim/Util.js";

class HoleSplitterType extends Tool {
    constructor() {
        super('T');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.strokeStyle = axis.isX() ? config.xBorderColor : config.zBorderColor;
        ctx.lineWidth = 2;
        ctx.fillRect(0, 0, w/4, h);
        ctx.strokeRect(0, 0, w/4, h);
        ctx.fillRect(w*3/4, 0, w/4, h);
        ctx.strokeRect(w*3/4, 0, w/4, h);

        ctx.fillStyle = 'red';
        ctx.fillRect(w/8, h/3, w*3/4, h/3);
    }

    canApply(args) {
        if (args.mouseButton !== 0) {
            return false;
        }
        let [i, j] = args.surface.layout.nearestDataCoord(...args.startPos);
        let [i2, j2] = args.surface.layout.nearestDataCoord(...args.endPos);
        if (i !== i2 || j !== j2 || !args.surface.layout.isDataQubit(i, j, true) || !args.surface.layout.isHole(i, j)) {
            return false;
        }

        let holes = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt));
        return holes.length === 2 && (holes[0][0] === holes[1][0] || holes[0][1] === holes[1][1]);
    }

    canHoverHint(args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.endPos);
        if (!args.surface.layout.isDataQubit(i, j, true) || !args.surface.layout.isHole(i, j)) {
            return false;
        }

        let holes = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt));
        return holes.length === 2 && (holes[0][0] === holes[1][0] || holes[0][1] === holes[1][1]);
    }

    drawHoverHint(ctx, args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.endPos);
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.endPos);
        let [x, y] = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt))[0];
        let axis = Axis.zIf(args.surface.layout.isZCheckQubit(x, y, true, true));
        args.surface.reset(i, j, axis.opposite());
        args.surface.layout.holes[i][j] = false;
    }
}

let HoleSplitter = new HoleSplitterType();

export {HoleSplitter}
