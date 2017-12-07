import {config} from "src/config.js"

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {!SurfaceCode} surface
 * @param {!int} i
 * @param {!int} j
 * @param {!boolean} xz
 */
function strokeErrorCurveAt(ctx, surface, i, j, xz) {
    let x = i * config.diam + 0.5;
    let y = j * config.diam + 0.5;

    if (surface.layout.isXCheckRow(j) === xz) {
        ctx.moveTo(x + config.diam / 2, y - config.diam / 2);
        ctx.lineTo(x + config.diam / 2, y + config.diam * 3 / 2);
    } else {
        ctx.moveTo(x - config.diam / 2, y + config.diam / 2);
        ctx.lineTo(x + config.diam * 3 / 2, y + config.diam / 2);
    }
}

export {strokeErrorCurveAt}
