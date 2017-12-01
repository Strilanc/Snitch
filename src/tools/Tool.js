/**
 * Implements an effect that can be applied to a surface code grid.
 */
class Tool {
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
