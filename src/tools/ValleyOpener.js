import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"

class ValleyOpenerType extends Tool {
    constructor() {
        super('W');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'red';
        ctx.fillRect(w/3, h/3, w*2/3, h/3);
    }

    canApply(args) {
        if (args.mouseButton !== 0) {
            return false;
        }
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        let i2 = Math.floor(args.endPos[0]);
        let j2 = Math.floor(args.endPos[1]);
        return i === i2 && j === j2 && args.surface.canGrowValley(i, j);
    }

    canHoverHint(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        return args.surface.canGrowValley(i, j);
    }

    drawHoverHint(ctx, args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'red';
        ctx.fillRect(i*config.diam, j*config.diam, config.diam, config.diam);
        ctx.strokeRect(i*config.diam, j*config.diam, config.diam, config.diam);
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        args.surface.growValley(i, j);
    }
}

let ValleyOpener = new ValleyOpenerType();

export {ValleyOpener}
