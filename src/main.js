window.onerror = function(msg, url, line, col, error) {
    document.getElementById('err_msg').textContent = describe(msg);
    document.getElementById('err_line').textContent = describe(line);
    document.getElementById('err_time').textContent = '' + new Date().getMilliseconds();
    if (error instanceof DetailedError) {
        document.getElementById('err_gen').textContent = describe(error.details);
    }
};

import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'
import {SurfaceCode} from 'src/sim/SurfaceCode.js'
import {ToolEffectArgs} from 'src/tools/ToolEffectArgs.js'
import {SquareHoleMaker} from 'src/tools/SquareHoleMaker.js'
import {describe} from "src/base/Describe.js";
import {config} from "src/config.js"

let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');

let surface = new SurfaceCode(50, 30);
surface.cycle();
surface.zero();
surface.cycle();
surface.clearFlips();

canvas.width = config.diam * surface.width + config.canvasPadding*2;
canvas.height = config.diam * surface.height + config.canvasPadding*2;


let latestToolArgs = new ToolEffectArgs(surface, undefined, undefined, undefined, false, false);
let lastMouseBlock = undefined;
let lastCtrlKey = false;

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

        ctx.globalAlpha *= 0.5;
        SquareHoleMaker.drawPreview(ctx, latestToolArgs);
    } finally {
        ctx.restore();
    }
}

function drawMouseHint(ctx) {
    if (lastMouseBlock === undefined) {
        return;
    }

    ctx.save();
    try {
        let [i, j] = lastMouseBlock;

        ctx.strokeStyle = '#000';
        ctx.strokeRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
        ctx.globalAlpha *= 0.5;

        if (surface.isDataQubit(i, j)) {
            ctx.lineWidth = 3;
            for (let xz of [false, true]) {
                ctx.beginPath();
                strokeErrorCurveAt(ctx, i, j, xz);
                //noinspection JSUnresolvedFunction
                ctx.setLineDash(xz ? [4, 4] : [6, 2]);
                ctx.strokeStyle = xz ? config.zOnColor : config.xOnColor;
                ctx.stroke();
            }
        }
        for (let xz of [false, true]) {
            if (lastCtrlKey) {
                if (surface.isCheckQubit(i, j, xz)) {
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    for (let [i2, j2] of surface.neighbors(i, j)) {
                        strokeErrorCurveAt(ctx, i2, j2, xz);
                    }
                    //noinspection JSUnresolvedFunction
                    ctx.setLineDash([4, 8]);
                    ctx.strokeStyle = xz ? config.zOnColor : config.xOnColor;
                    ctx.stroke();
                }
            } else {
                if (surface.isCheckQubit(i, j, xz, true)) {
                    if (surface.isHole(i, j)) {
                        ctx.fillStyle = surface.isZCheckQubit(i, j, true) ? config.zOnColor : config.zOffColor;
                        ctx.fillRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
                        for (let [di, dj] of SurfaceCode.cardinals()) {
                            let i2 = i + di;
                            let j2 = j + dj;
                            if (surface.isHole(i2, j2) && surface.isDataQubit(i2, j2, true) && surface.isHole(i + 2 * di, j + 2 * dj)) {
                                if (!surface.isHole(i2 + dj, j2 + di) || !surface.isHole(i2 - dj, j2 - di)) {
                                    ctx.fillStyle = config.dataQubitColor;
                                    ctx.fillRect((i + di) * config.diam + 0.5, (j + dj) * config.diam + 0.5, config.diam, config.diam);
                                }
                            }
                        }
                    } else {
                        ctx.fillStyle = config.holeColor;
                        ctx.fillRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
                        for (let [di, dj] of SurfaceCode.cardinals()) {
                            if (surface.isDataQubit(i + di, j + dj) && surface.isHole(i + 2 * di, j + 2 * dj)) {
                                ctx.fillRect((i + di) * config.diam + 0.5, (j + dj) * config.diam + 0.5, config.diam, config.diam);
                            }
                        }
                    }
                }
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
    ctx.fillRect(0, 0, surface.width * config.diam, surface.height * config.diam);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(true, false), config.xOffColor);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(true, true), config.xOnColor);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(false, false), config.zOffColor);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(false, true), config.zOnColor);
    drawQubitBlocksOfType(ctx, surface.holePoints(0), config.holeColor);
}

function drawSingleBorder(ctx, i, j, di, dj) {
    let type = surface.borderType(i, j, di, dj);
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
    for (let [i, j] of surface.holePoints()) {
        for (let [di, dj] of SurfaceCode.cardinals()) {
            drawSingleBorder(ctx, i, j, di, dj);
        }
    }
}

function strokeErrorCurveAt(ctx, i, j, xz) {
    let x = i * config.diam + 0.5;
    let y = j * config.diam + 0.5;

    if (surface.isXCheckRow(j) === xz) {
        ctx.moveTo(x + config.diam / 2, y - config.diam / 2);
        ctx.lineTo(x + config.diam / 2, y + config.diam * 3 / 2);
    } else {
        ctx.moveTo(x - config.diam / 2, y + config.diam / 2);
        ctx.lineTo(x + config.diam * 3 / 2, y + config.diam / 2);
    }
}

function drawErrorCurves(ctx) {
    for (let xz of [false, true]) {
        ctx.beginPath();
        let flips = surface.xzFlips(xz);
        for (let [i, j] of surface.dataPoints()) {
            if (flips[i][j]) {
                strokeErrorCurveAt(ctx, i, j, xz);
            }
        }
        ctx.strokeStyle = xz ? config.zOnColor : config.xOnColor;
        ctx.stroke();
    }
}

setInterval(() => {
    surface.error();
    surface.cycle();
    draw();
}, 100);

document.onkeyup = ev => {
    lastCtrlKey = ev.ctrlKey;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
};

document.onkeydown = ev => {
    lastCtrlKey = ev.ctrlKey;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    if (ev.keyCode === 32) {
        ev.preventDefault();
        surface.correct();
        surface.cycle();
        draw();
    } else if (ev.keyCode === 65) {
        ev.preventDefault();
        surface.clean_areas();
    } else if (ev.keyCode === 69) {
        ev.preventDefault();
        surface.error(0.001);
    }
};

canvas.onmousemove = ev => {
    let b = canvas.getBoundingClientRect();
    let x = (ev.x - config.canvasPadding - b.left) / config.diam;
    let y = (ev.y - config.canvasPadding - b.top) / config.diam;
    lastCtrlKey = ev.ctrlKey;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    latestToolArgs.mousePos = [x, y];
    latestToolArgs.mouseButton = ev.button;
    let i = Math.floor(x);
    let j = Math.floor(y);
    lastMouseBlock = [i, j];
};

canvas.onmouseout = ev => {
    lastMouseBlock = undefined;
    lastCtrlKey = ev.ctrlKey;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    latestToolArgs.mousePos = undefined;
};

canvas.onmouseup = ev => {
    let b = canvas.getBoundingClientRect();

    let x = (ev.x - config.canvasPadding - b.left) / config.diam;
    let y = (ev.y - config.canvasPadding - b.top) / config.diam;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;
    latestToolArgs.mousePos = [x, y];
    latestToolArgs.mouseButton = ev.button;
    SquareHoleMaker.applyEffect(latestToolArgs);

    latestToolArgs.dragStartPos = undefined;

    let i = Math.floor(x);
    let j = Math.floor(y);

    lastCtrlKey = ev.ctrlKey;
    lastMouseBlock = [i, j];
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
    let i = Math.floor(x);
    let j = Math.floor(y);
    lastMouseBlock = [i, j];
    lastCtrlKey = ev.ctrlKey;
    latestToolArgs.ctrlKey = ev.ctrlKey;
    latestToolArgs.shiftKey = ev.shiftKey;

    if (surface.isDataQubit(i, j)) {
        if (ev.button === 0) {
            surface.state.x(surface.qubits[i][j]);
            if (!ev.altKey) {
                surface.xFlips[i][j] ^= true;
            }
        } else {
            surface.state.z(surface.qubits[i][j]);
            if (!ev.altKey) {
                surface.zFlips[i][j] ^= true;
            }
        }
    }

    if (ev.ctrlKey) {
        for (let xz of [false, true]) {
            if (surface.isCheckQubit(i, j, xz)) {
                for (let [i2, j2] of surface.neighbors(i, j)) {
                    surface.doXZ(i2, j2, xz, ev.altKey);
                }
            }
        }
    } else {
        if (ev.button === 0) {
            if (surface.isCheckQubit(i, j, undefined, true) && surface.isHole(i, j)) {
                surface.holes[i][j] = true;
            }
        }
    }

    surface.cycle();
    draw();
};
