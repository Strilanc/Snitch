import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {SurfaceQubitObservable} from "src/sim/SurfaceCodeObservableOverlay.js";
import {Axis} from "src/sim/Axis.js";

class HoleDestroyerType extends Tool {
    constructor() {
        super('K');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = axis.isX() ? config.xBorderColor : config.zBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);

        //noinspection JSUnresolvedFunction
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    canApply(args) {
        if (args.mouseButton !== 0) {
            return false;
        }
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        let i2 = Math.floor(args.endPos[0]);
        let j2 = Math.floor(args.endPos[1]);

        return args.surface.layout.isHole(i, j) && args.surface.layout.isSameHole(i, j, i2, j2);
    }

    canHoverHint(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        return args.surface.layout.isHole(i, j);
    }

    drawHoverHint(ctx, args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        ctx.fillStyle = 'white';
        for (let [x, y] of args.surface.layout.holeFloodFill(i, j)) {
            ctx.fillRect(x*config.diam, y*config.diam, config.diam, config.diam);
        }
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        for (let [x, y] of args.surface.layout.holeFloodFill(i, j)) {
            args.surface.layout.holes[x][y] = false;
        }
        let axis = Axis.zIf(args.surface.layout.isZCheckQubit(i, j, true));

        let nearby = args.surface.layout.nearbyCheckBorderLoc(i, j, axis);
        if (nearby === undefined) {
            // TODO: when does this happen?
            return;
        }
        let path = args.surface.layout.pathAlongCheckQubits(i, j, nearby.i, nearby.j);
        if (path === undefined) {
            // TODO: when does this happen?
            return;
        }

        args.surface.measureAndConditionalToggle(
            [[i, j]],
            [],
            path.dataQubits.map(([x, y]) => new SurfaceQubitObservable(x, y, axis.opposite())));
    }
}

let HoleDestroyer = new HoleDestroyerType();

export {HoleDestroyer}
