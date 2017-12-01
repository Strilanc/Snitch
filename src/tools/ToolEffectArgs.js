/**
 * A description of the what the user did with the mouse/keyboard. Used by tools when deciding what exactly to do.
 */
class ToolEffectArgs {
    /**
     * @param {!SurfaceCode} surface
     * @param {undefined|![!number, !number]} mousePos
     * @param {undefined|!int}mouseButton
     * @param {undefined|![!number, !number]} dragStartPos
     * @param {!boolean} ctrlHeld
     * @param {!boolean} shiftHeld
     */
    constructor(surface, mousePos, mouseButton, dragStartPos, ctrlHeld, shiftHeld) {
        this.surface = surface;
        this.mousePos = mousePos;
        this.mouseButton = mouseButton;
        this.dragStartPos = dragStartPos;
        this.ctrlHeld = ctrlHeld;
        this.shiftHeld = shiftHeld;
    }
}

export {ToolEffectArgs}
