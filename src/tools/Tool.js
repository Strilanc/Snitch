/**
 * Implements an effect that can be applied to a surface code grid.
 */
class Tool {
    /**
     * @param {undefined|!string} hotkey
     */
    constructor(hotkey) {
        this.hotkey = hotkey;
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!number} x
     * @param {!number} y
     * @param {!number} w
     * @param {!number} h
     * @param {!boolean} active
     * @param {!Axis} axis
     */
    drawButton(ctx, x, y, w, h, active, axis) {
        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = active ? 2 : 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = active ? 'yellow' : 'white';
        ctx.fillRect(x, y, w, h);

        ctx.restore();

        ctx.save();
        try {
            let p = 5;
            ctx.translate(x + p, y + p);
            this.drawButtonContents(ctx, w - p * 2, h - p * 2, active, axis);
        } finally {
            ctx.restore();
        }

        ctx.fillStyle = 'black';
        ctx.font = '16pt monospace';
        ctx.strokeStyle = 'white';
        ctx.textBaseline = 'middle';
        ctx.strokeText(this.hotkey, x + w + 2, y + h/2, w);
        ctx.fillText(this.hotkey, x + w + 2, y + h/2, w);
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!number} w
     * @param {!number} h
     * @param {!boolean} active
     * @param {!Axis} axis
     */
    drawButtonContents(ctx, w, h, active, axis) {
        throw Error(`drawButton not implemented by ${this}`);
    }

    /**
     * @param {!ToolEffectArgs} args
     * @returns {!boolean}
     */
    canApply(args) {
        throw Error(`canApply not implemented by ${this}`);
    }

    /**
     * @param {!ToolEffectArgs} args
     * @returns {!boolean}
     */
    canHoverHint(args) {
        throw Error(`canHoverHint not implemented by ${this}`);
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!ToolEffectArgs} args
     */
    drawHoverHint(ctx, args) {
        throw Error(`drawHoverHint not implemented by ${this}`);
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!ToolEffectArgs} args
     */
    drawPreview(ctx, args) {
        throw Error(`drawPreview not implemented by ${this}`);
    }

    /**
     * @param {!ToolEffectArgs} args
     */
    applyEffect(args) {
        throw Error(`applyEffect not implemented by ${this}`);
    }
}

export {Tool}
