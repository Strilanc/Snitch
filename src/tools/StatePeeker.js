/**
 * Implements an effect that can be applied to a surface code grid.
 */
import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"

class StatePeekerType extends Tool {
    constructor() {
        super('M');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/2, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/4, 0, Math.PI*2);
        ctx.fillStyle = 'black';
        ctx.fill();
    }

    canApply(args) {
        return false;
    }

    canHoverHint(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos === undefined &&
            args.mouseButton === undefined &&
            args.surface.layout.isDataQubit(Math.floor(args.mousePos[0]), Math.floor(args.mousePos[1]), true);
    }

    drawHoverHint(ctx, args) {
        let i = Math.floor(args.mousePos[0]);
        let j = Math.floor(args.mousePos[1]);
        let q = args.surface.state.qubitMap.get(args.surface.qubits[i][j]);
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#FFF';
        ctx.textBaseline = 'middle';
        ctx.font = '12pt monospace';
        ctx.globalAlpha = 1.0;
        let xs = q.obsX.toString(5);
        let zs = q.obsZ.toString(5);
        let w = Math.max(ctx.measureText(xs).width, ctx.measureText(zs).width);
        ctx.strokeRect((i+1) * config.diam + 0.5, j * config.diam + 0.5, w + 6, config.diam*2);
        ctx.fillRect((i+1) * config.diam + 0.5, j * config.diam + 0.5, w + 6, config.diam*2);
        ctx.fillStyle = '#000';
        ctx.fillText(xs, (i+1)*config.diam+3, (j+0.5)*config.diam);
        ctx.fillText(zs, (i+1)*config.diam+3, (j+1.5)*config.diam);
    }

    drawPreview(ctx, args) {
        // never called
    }

    applyEffect(args) {
        // never called
    }
}

let StatePeeker = new StatePeekerType();

export {StatePeeker}
