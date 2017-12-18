import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js";
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";
import {BorderLoc} from "src/sim/SurfaceCodeLayout.js";

class HoleJoinerType extends Tool {
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
        let [i, j] = args.surface.layout.nearestDataCoord(...args.startPos);
        let [i2, j2] = args.surface.layout.nearestDataCoord(...args.endPos);
        if (i !== i2 || j !== j2 || !args.surface.layout.isDataQubit(i, j)) {
            return false;
        }

        let holes = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt));
        return holes.length === 2 && (holes[0][0] === holes[1][0] || holes[0][1] === holes[1][1]);
    }

    canHoverHint(args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.endPos);
        if (!args.surface.layout.isDataQubit(i, j)) {
            return false;
        }

        let holes = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt));
        return holes.length === 2 && (holes[0][0] === holes[1][0] || holes[0][1] === holes[1][1]);
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
        let [x1, y1] = args.surface.layout.neighbors(i, j, true, true).
            filter(pt => args.surface.layout.isHole(...pt))[0];

        let border = args.surface.layout.fullContiguousBorderTouching(new BorderLoc(i, j, x1 - i, y1 - j));
        let axis = border.axis;

        args.surface.observableOverlay.observables = args.surface.observableOverlay.observables.filter(
            obs => obs.indexOf(new SurfaceQubitObservable(i, j, axis.opposite())) !== undefined);

        args.surface.measureAndConditionalToggle(
            [],
            [new SurfaceQubitObservable(i, j, axis.opposite())],
            border.locs.map(loc => new SurfaceQubitObservable(loc.i, loc.j, axis)));

        args.surface.layout.holes[i][j] = true;
    }
}

let HoleJoiner = new HoleJoinerType();

export {HoleJoiner}
