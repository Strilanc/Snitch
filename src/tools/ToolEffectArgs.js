/**
 * A description of the what the user did with the mouse/keyboard. Used by tools when deciding what exactly to do.
 */
class ToolEffectArgs {
    /**
     * @param {!SurfaceCode} surface
     * @param {undefined|![!number, !number]} mousePos
     * @param {undefined|!int}mouseButton
     * @param {undefined|![!number, !number]} startPos
     * @param {!boolean} ctrlKey
     * @param {!boolean} shiftKey
     */
    constructor(surface, mousePos, mouseButton, startPos, ctrlKey, shiftKey) {
        this.surface = surface;
        this.endPos = mousePos;
        this.mouseButton = mouseButton;
        this.startPos = startPos;
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.mousePointerOut = undefined;
    }
}

export {ToolEffectArgs}
