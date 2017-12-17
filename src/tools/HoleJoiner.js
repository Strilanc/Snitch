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
        return holes.length === 2 && (holes[0][0] === holes[1][0] || holes[0][1] === holes[1][1]);
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
        return holes.length === 2 && (holes[0][0] === holes[1][0] || holes[0][1] === holes[1][1]);
    }

    drawHoverHint(ctx, args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.mousePos);
        let [[x1, y1], [x2, y2]] = args.surface.layout.neighbors(i, j, true, true).
            filter(pt => args.surface.layout.isHole(...pt));
        ctx.fillStyle = 'black';
        ctx.strokeStyle = args.surface.layout.isSameHole(x1, y1, x2, y2) ? 'black' : 'red';
        ctx.lineWidth = 2;
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        ctx.globalAlpha = 1 - 0.5*(1 - ctx.globalAlpha);
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.mousePos);
        let [x1, y1] = args.surface.layout.neighbors(i, j, true, true).
            filter(pt => args.surface.layout.isHole(...pt))[0];

        let border = args.surface.layout.fullContiguousBorderTouching(new BorderLoc(i, j, x1 - i, y1 - j));
        let axis = border.axis;
        let flipQubits = args.surface.measure(i, j, axis.opposite());
        let flipErrorMarks = args.surface.errorOverlay.flipsForAxis(axis)[i][j];

        for (let loc of border.locs) {
            args.surface.errorOverlay.flipQubit(loc.i, loc.j, axis, flipErrorMarks, flipQubits);
        }

        let color = flipQubits ? 'red' : 'black';
        args.surface.sparkles.bang(i, j, color, 3);
        for (let loc of border.locs) {
            let c = loc.center();
            args.surface.sparkles.bang(c[0] - 0.5, c[1] - 0.5, color, 0.5);
        }

        args.surface.observableOverlay.observables = args.surface.observableOverlay.observables.
            filter(obs => obs.indexOf(new SurfaceQubitObservable(i, j, axis)) === undefined);
        for (let obs of args.surface.observableOverlay.observables) {
            let k2 = obs.indexOf(new SurfaceQubitObservable(i, j, axis.opposite()));
            if (k2 !== undefined) {
                obs.qubitObservables.splice(k2, 1);
            }
        }

        args.surface.layout.holes[i][j] = true;
    }
}

let HoleJoiner = new HoleJoinerType();

export {HoleJoiner}
