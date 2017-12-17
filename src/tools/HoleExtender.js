import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";

class HoleExtenderType extends Tool {
    constructor() {
        super('X');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w/4, h);

        ctx.strokeStyle = axis.isX() ? config.xBorderColor : config.zBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w/4, h);

        ctx.fillStyle = 'gray';
        ctx.fillRect(w/8, h/3, w*7/8, h/3);
    }

    canApply(args) {
        if (args.mousePos === undefined ||
                args.dragStartPos === undefined ||
                args.mouseButton !== 0) {
            return false;
        }
        let [i, j] = args.surface.layout.nearestDataCoord(...args.dragStartPos);
        let [i2, j2] = args.surface.layout.nearestDataCoord(...args.mousePos);
        if (i !== i2 || j !== j2 || !args.surface.layout.isDataQubit(i, j)) {
            return false;
        }

        let holes = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt));
        return holes.length === 1;
    }

    canHoverHint(args) {
        if (args.mousePos === undefined ||
                args.dragStartPos !== undefined ||
                args.mouseButton !== undefined) {
            return false;
        }
        let [i, j] = args.surface.layout.nearestDataCoord(...args.mousePos);
        if (!args.surface.layout.isDataQubit(i, j)) {
            return false;
        }

        let holes = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt));
        return holes.length === 1;
    }

    drawHoverHint(ctx, args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.mousePos);
        let [x, y] = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt))[0];
        let di = i - x;
        let dj = j - y;
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.fillRect((i + di)*config.diam, (j + dj)*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.mousePos);
        let [x, y] = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt))[0];
        let di = i - x;
        let dj = j - y;
        args.surface.extendHole(i + di, j + dj, [-di, -dj]);
    }
}

let HoleExtender = new HoleExtenderType();

export {HoleExtender}
