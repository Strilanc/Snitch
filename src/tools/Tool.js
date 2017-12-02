/**
 * Implements an effect that can be applied to a surface code grid.
 */
class Tool {
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
