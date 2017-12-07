window.onerror = function(msg, url, line, col, error) {
    document.getElementById('err_msg').textContent = describe(msg);
    document.getElementById('err_line').textContent = describe(line);
    document.getElementById('err_time').textContent = '' + new Date().getMilliseconds();
    if (error instanceof DetailedError) {
        document.getElementById('err_gen').textContent = describe(error.details);
    }
};

import {DetailedError} from 'src/base/DetailedError.js'
import {SurfaceCode} from 'src/sim/SurfaceCode.js'
import {CARDINALS} from 'src/sim/Util.js'
import {ToolEffectArgs} from 'src/tools/ToolEffectArgs.js'
import {SquareHoleMaker} from 'src/tools/SquareHoleMaker.js'
import {SquareStabilizerFlipper} from 'src/tools/SquareStabilizerFlipper.js'
import {HoleDragger} from 'src/tools/HoleDragger.js'
import {ErrorPathMaker} from 'src/tools/ErrorPathMaker.js'
import {describe} from "src/base/Describe.js";
import {config} from "src/config.js"
import {Revision} from "src/base/Revision.js";
import {strokeErrorCurveAt} from "src/draw/Common.js";
import {AXES, X_AXIS, Z_AXIS} from "src/sim/Util.js";

let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');
/** @type {!Array.<!Tool>} */
let activeTools = [SquareHoleMaker, ErrorPathMaker, SquareStabilizerFlipper, HoleDragger];

/** @type {!SurfaceCode} */
let surface = new SurfaceCode(50, 30);
surface.cycle();
surface.zero();
surface.cycle();
surface.clearFlips();
surface.cycle();
/** @type {!Revision} */
let revision = Revision.startingAt(surface.clone());

canvas.width = config.diam * surface.layout.width + config.canvasPadding*2;
canvas.height = config.diam * surface.layout.height + config.canvasPadding*2;

/** @type {!ToolEffectArgs} */
let latestToolArgs = new ToolEffectArgs(surface, undefined, undefined, undefined, false, false);

function draw() {
    let ctx = canvas.getContext('2d');
    ctx.save();
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(config.canvasPadding, config.canvasPadding);

        drawQubitBlocks(ctx);
        drawHoleBorders(ctx);
        drawErrorCurves(ctx);
        drawMouseHint(ctx);
    } finally {
        ctx.restore();
    }
}

function drawMouseHint(ctx) {
    ctx.save();
    try {
        ctx.globalAlpha *= 0.5;

        for (let e of activeTools) {
            if (e.canApply(latestToolArgs)) {
                e.drawPreview(ctx, latestToolArgs);
                break;
            } else if (e.canHoverHint(latestToolArgs)) {
                e.drawHoverHint(ctx, latestToolArgs);
                break;
            }
        }
    } finally {
        ctx.restore();
    }
}
function drawQubitBlocksOfType(ctx, points, color) {
    ctx.beginPath();
    for (let [i, j] of points) {
        let x = i * config.diam;
        let y = j * config.diam;
        ctx.moveTo(x, y);
        ctx.lineTo(x + config.diam, y);
        ctx.lineTo(x + config.diam, y + config.diam);
        ctx.lineTo(x, y + config.diam);
        ctx.lineTo(x, y);
    }
    ctx.fillStyle = color;
    ctx.fill();
}

function drawQubitBlocks(ctx) {
    ctx.fillStyle = config.dataQubitColor;
    ctx.fillRect(0, 0, surface.layout.width * config.diam, surface.layout.height * config.diam);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(X_AXIS, false), config.xOffColor);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(X_AXIS, true), config.xOnColor);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(Z_AXIS, false), config.zOffColor);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(Z_AXIS, true), config.zOnColor);
    drawQubitBlocksOfType(ctx, surface.layout.holePoints(0), config.holeColor);
}

function drawSingleBorder(ctx, i, j, di, dj) {
    let type = surface.layout.borderType(i, j, di, dj);
    if (type === undefined) {
        return;
    }

    let ai = Math.abs(di);
    let aj = Math.abs(dj);
    let x = i * config.diam;
    let y = j * config.diam;
    ctx.fillStyle = type === 'Z' ? config.zBorderColor : config.xBorderColor;
    ctx.fillRect(
        x + (config.diam - config.borderWidth) * (di + 1) / 2 * ai,
        y + (config.diam - config.borderWidth) * (dj + 1) / 2 * aj,
        aj * config.diam + config.borderWidth * ai,
        ai * config.diam + config.borderWidth * aj);
}


function drawHoleBorders(ctx) {
    for (let [i, j] of surface.layout.holePoints()) {
        for (let [di, dj] of CARDINALS) {
            drawSingleBorder(ctx, i, j, di, dj);
        }
    }
}

function drawErrorCurves(ctx) {
    for (let axis of AXES) {
        ctx.beginPath();
        let flips = surface.xzFlips(axis.opposite());
        for (let [i, j] of surface.layout.dataPoints()) {
            if (flips[i][j]) {
                strokeErrorCurveAt(ctx, surface, i, j, axis);
            }
        }
        ctx.strokeStyle = axis.isZ() ? config.zOnColor : config.xOnColor;
        ctx.stroke();
    }
}

//noinspection JSUnresolvedVariable
let lastDrawTime = window.performance.now();
let timeUntilNextCycle = 0;
function drawingCycle() {
    //noinspection JSUnresolvedVariable
    let dt = window.performance.now() - lastDrawTime;
    timeUntilNextCycle -= dt;
    lastDrawTime += dt;
    if (timeUntilNextCycle < 0) {
        surface.cycle();
        timeUntilNextCycle %= 100;
        timeUntilNextCycle += 100;
    }
    requestAnimationFrame(draw);
}
setInterval(drawingCycle, 100);

document.onkeyup = ev => {
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    requestAnimationFrame(draw);
};

document.onkeydown = ev => {
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    if (ev.keyCode === 32) {
        ev.preventDefault();
        surface.correct();
        surface.cycle();
    } else if (ev.keyCode === 'Z'.charCodeAt(0) && ev.ctrlKey && !ev.shiftKey) {
        ev.preventDefault();
        if (!revision.isAtBeginningOfHistory()) {
            if (revision.isWorkingOnCommit) {
                revision.commit(surface.clone());
            }
            surface = revision.undo().clone();
            latestToolArgs.surface = surface;
        }
    } else if ((ev.keyCode === 'Z'.charCodeAt(0) && ev.ctrlKey && ev.shiftKey) ||
            (ev.keyCode === 'Y'.charCodeAt(0) && ev.ctrlKey && !ev.shiftKey)) {
        ev.preventDefault();
        if (!revision.isAtEndOfHistory()) {
            surface = revision.redo().clone();
            latestToolArgs.surface = surface;
        }
    } else if (ev.keyCode === 'A'.charCodeAt(0)) {
        ev.preventDefault();
        surface.clean_areas();
    } else if (ev.keyCode === 'E'.charCodeAt(0)) {
        ev.preventDefault();
        surface.error(0.001);
        surface.cycle();
    }
    requestAnimationFrame(draw);
};

canvas.onmousemove = ev => {
    let b = canvas.getBoundingClientRect();
    let x = (ev.x - config.canvasPadding - b.left) / config.diam;
    let y = (ev.y - config.canvasPadding - b.top) / config.diam;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    latestToolArgs.mousePos = [x, y];
    requestAnimationFrame(draw);
};

canvas.onmouseout = ev => {
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    latestToolArgs.mousePos = undefined;
    requestAnimationFrame(draw);
};

canvas.onmouseup = ev => {
    let b = canvas.getBoundingClientRect();
    let x = (ev.x - config.canvasPadding - b.left) / config.diam;
    let y = (ev.y - config.canvasPadding - b.top) / config.diam;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    latestToolArgs.mousePos = [x, y];
    latestToolArgs.mouseButton = ev.button;

    for (let e of activeTools) {
        if (e.canApply(latestToolArgs)) {
            if (revision.isWorkingOnCommit) {
                revision.commit(surface.clone());
            } else {
                if (revision.isAtBeginningOfHistory()) {
                    revision = Revision.startingAt(surface.clone());
                } else {
                    revision.undo();
                    revision.commit(surface.clone());
                }
            }
            revision.startedWorkingOnCommit();
            e.applyEffect(latestToolArgs);
            surface.cycle();
            break;
        }
    }

    latestToolArgs.dragStartPos = undefined;
    latestToolArgs.mouseButton = undefined;
    requestAnimationFrame(draw);
};

canvas.onmousedown = ev => {
    ev.preventDefault();
    let b = canvas.getBoundingClientRect();
    let x = (ev.x - config.canvasPadding - b.left) / config.diam;
    let y = (ev.y - config.canvasPadding - b.top) / config.diam;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    latestToolArgs.dragStartPos = [x, y];
    latestToolArgs.mousePos = [x, y];
    latestToolArgs.mouseButton = ev.button;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;

    requestAnimationFrame(draw);
};
