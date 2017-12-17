/**
 * A description of the what the user did with the mouse/keyboard. Used by tools when deciding what exactly to do.
 */
class ToolEffectArgs {
    /**
     * @param {!SurfaceCode} surface
     * @param {undefined|![!number, !number]} mousePos
     * @param {undefined|!int}mouseButton
     * @param {undefined|![!number, !number]} dragStartPos
     * @param {!boolean} ctrlKey
     * @param {!boolean} shiftKey
     */
    constructor(surface, mousePos, mouseButton, dragStartPos, ctrlKey, shiftKey) {
        this.surface = surface;
        this.mousePos = mousePos;
        this.mouseButton = mouseButton;
        this.dragStartPos = dragStartPos;
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.mousePointerOut = undefined;
    }
}

export {ToolEffectArgs}
