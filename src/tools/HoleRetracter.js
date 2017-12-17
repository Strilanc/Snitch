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
        if (args.mousePos === undefined ||
                args.dragStartPos === undefined ||
                args.mouseButton !== 0) {
            return false;
        }
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.dragStartPos);
        let [i2, j2] = args.surface.layout.nearestCheckCoord(...args.mousePos);
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
        if (args.mousePos === undefined ||
                args.dragStartPos !== undefined ||
                args.mouseButton !== undefined) {
            return false;
        }
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.mousePos);
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
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.mousePos);
        let [x, y] = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt))[0];
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.fillRect(x*config.diam, y*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        ctx.globalAlpha = 1 - 0.5*(1 - ctx.globalAlpha);
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let [i, j] = args.surface.layout.nearestCheckCoord(...args.mousePos);
        let [x, y] = args.surface.layout.neighbors(i, j, true, true).filter(pt => args.surface.layout.isHole(...pt))[0];

        args.surface.layout.holes[i][j] = false;
        args.surface.layout.holes[x][y] = false;
        let axis = Axis.zIf(args.surface.layout.isZCheckQubit(i, j));
        args.surface.reset(x, y, axis.opposite(), false);

        let flipQubit = args.surface.squareMeasure(i, j, axis);
        if (flipQubit) {
            let q = args.surface.qubits[x][y];
            if (axis.isZ()) {
                args.surface.state.x(q);
            } else {
                args.surface.state.z(q);
            }
        }
        args.surface.sparkles.bang(x, y, flipQubit ? 'red' : 'black', 0.5);

        let flipErrorMark = false;
        for (let [i2, j2] of args.surface.layout.neighbors(i, j)) {
            if (args.surface.errorOverlay.flipsForAxis(axis.opposite())[i2][j2]) {
                flipErrorMark = !flipErrorMark;
            }
        }
        args.surface.errorOverlay.flipsForAxis(axis.opposite())[x][y] = flipErrorMark;

        let newObs = new SurfaceQubitObservable(x, y, axis.opposite());
        for (let obs of args.surface.observableOverlay.observables) {
            let flipObs = false;
            for (let [i2, j2] of args.surface.layout.neighbors(i, j)) {
                if (obs.indexOf(new SurfaceQubitObservable(i2, j2, axis.opposite())) !== undefined) {
                    flipObs = !flipObs;
                }
            }

            if (flipObs) {
                obs.insertOrDeleteOther(0, newObs);
            }
        }
    }
}

let HoleRetracter = new HoleRetracterType();

export {HoleRetracter}
