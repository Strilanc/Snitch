import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'
import {SurfaceCode} from 'src/sim/SurfaceCode.js'
import {describe} from "src/base/Describe.js";

window.onerror = function(msg, url, line, col, error) {
    document.getElementById('err_msg').textContent = describe(msg);
    document.getElementById('err_line').textContent = describe(line);
    document.getElementById('err_time').textContent = '' + new Date().getMilliseconds();
    if (error instanceof DetailedError) {
        document.getElementById('err_gen').textContent = describe(error.details);
    }
};

let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');

let surface = new SurfaceCode(50, 30);
surface.cycle();
surface.zero();
surface.cycle();
surface.clearFlips();

let diam = 20;
let canvasPadding = 5;
canvas.width = diam * surface.width + canvasPadding*2;
canvas.height = diam * surface.height + canvasPadding*2;

const X_ON_COLOR = '#55F';
const X_BORDER_COLOR = '#55F';
const X_OFF_COLOR = '#E6E6FF';

const Z_ON_COLOR = '#0A0';
const Z_BORDER_COLOR = '#0A0';
const Z_OFF_COLOR = '#DFD';

const D_COLOR = '#FFF';
const H_COLOR = '#000';

let lastMouseBlock = undefined;
let lastCtrlKey = false;

function draw() {
    let ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvasPadding, canvasPadding);

    drawQubitBlocks(ctx);
    drawHoleBorders(ctx);
    drawErrorCurves(ctx);
    drawMouseHint(ctx);

    ctx.restore();
}

function drawMouseHint(ctx) {
    if (lastMouseBlock === undefined) {
        return;
    }

    ctx.save();
    let [i, j] = lastMouseBlock;

    ctx.strokeStyle = '#000';
    ctx.strokeRect(i*diam+0.5, j*diam+0.5, diam, diam);
    ctx.globalAlpha *= 0.5;

    if (surface.isDataQubit(i, j)) {
        ctx.lineWidth = 3;
        for (let xz of [false, true]) {
            ctx.beginPath();
            strokeErrorCurveAt(ctx, i, j, xz);
            //noinspection JSUnresolvedFunction
            ctx.setLineDash(xz ? [4, 4] : [6, 2]);
            ctx.strokeStyle = xz ? Z_ON_COLOR : X_ON_COLOR;
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
                ctx.strokeStyle = xz ? Z_ON_COLOR : X_ON_COLOR;
                ctx.stroke();
            }
        } else {
            if (surface.isCheckQubit(i, j, xz, true)) {
                if (surface.isHole(i, j)) {
                    ctx.fillStyle = surface.isZCheckQubit(i, j, true) ? Z_ON_COLOR : Z_OFF_COLOR;
                    ctx.fillRect(i * diam + 0.5, j * diam + 0.5, diam, diam);
                    for (let [di, dj] of SurfaceCode.cardinals()) {
                        let i2 = i + di;
                        let j2 = j + dj;
                        if (surface.isHole(i2, j2) && surface.isDataQubit(i2, j2, true) && surface.isHole(i + 2 * di, j + 2 * dj)) {
                            if (!surface.isHole(i2+dj, j2+di) || !surface.isHole(i2-dj, j2-di)) {
                                ctx.fillStyle = D_COLOR;
                                ctx.fillRect((i + di) * diam + 0.5, (j + dj) * diam + 0.5, diam, diam);
                            }
                        }
                    }
                } else {
                    ctx.fillStyle = H_COLOR;
                    ctx.fillRect(i * diam + 0.5, j * diam + 0.5, diam, diam);
                    for (let [di, dj] of SurfaceCode.cardinals()) {
                        if (surface.isDataQubit(i + di, j + dj) && surface.isHole(i + 2 * di, j + 2 * dj)) {
                            ctx.fillRect((i + di) * diam + 0.5, (j + dj) * diam + 0.5, diam, diam);
                        }
                    }
                }
            }
        }
    }
    ctx.restore();
}
function drawQubitBlocksOfType(ctx, points, color) {
    ctx.beginPath();
    for (let [i, j] of points) {
        let x = i * diam;
        let y = j * diam;
        ctx.moveTo(x, y);
        ctx.lineTo(x + diam, y);
        ctx.lineTo(x + diam, y + diam);
        ctx.lineTo(x, y + diam);
        ctx.lineTo(x, y);
    }
    ctx.fillStyle = color;
    ctx.fill();
}

function drawQubitBlocks(ctx) {
    ctx.fillStyle = D_COLOR;
    ctx.fillRect(0, 0, surface.width * diam, surface.height * diam);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(true, false), X_OFF_COLOR);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(true, true), X_ON_COLOR);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(false, false), Z_OFF_COLOR);
    drawQubitBlocksOfType(ctx, surface.checkQubitsWithResult(false, true), Z_ON_COLOR);
    drawQubitBlocksOfType(ctx, surface.holePoints(0), H_COLOR);
}

function drawSingleBorder(ctx, i, j, di, dj) {
    let type = surface.borderType(i, j, di, dj);
    if (type === undefined) {
        return;
    }

    let ai = Math.abs(di);
    let aj = Math.abs(dj);
    let x = i * diam;
    let y = j * diam;
    ctx.fillStyle = type === 'Z' ? Z_BORDER_COLOR : X_BORDER_COLOR;
    ctx.fillRect(
        x + (diam - 3) * (di + 1) / 2 * ai,
        y + (diam - 3) * (dj + 1) / 2 * aj,
        aj * diam + 3 * ai,
        ai * diam + 3 * aj);
}


function drawHoleBorders(ctx) {
    for (let [i, j] of surface.holePoints()) {
        for (let [di, dj] of SurfaceCode.cardinals()) {
            drawSingleBorder(ctx, i, j, di, dj);
        }
    }
}

function strokeErrorCurveAt(ctx, i, j, xz) {
    let x = i * diam + 0.5;
    let y = j * diam + 0.5;

    if (surface.isXCheckRow(j) === xz) {
        ctx.moveTo(x + diam / 2, y - diam / 2);
        ctx.lineTo(x + diam / 2, y + diam * 3 / 2);
    } else {
        ctx.moveTo(x - diam / 2, y + diam / 2);
        ctx.lineTo(x + diam * 3 / 2, y + diam / 2);
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
        ctx.strokeStyle = xz ? Z_ON_COLOR : X_ON_COLOR;
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
};

document.onkeydown = ev => {
    lastCtrlKey = ev.ctrlKey;
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
    let i = Math.floor((ev.x - canvasPadding - b.left) / diam);
    let j = Math.floor((ev.y - canvasPadding - b.top) / diam);
    lastCtrlKey = ev.ctrlKey;
    lastMouseBlock = [i, j];
};

canvas.onmouseout = ev => {
    lastMouseBlock = undefined;
    lastCtrlKey = ev.ctrlKey;
};

canvas.onmousedown = ev => {
    ev.preventDefault();
    let b = canvas.getBoundingClientRect();
    let i = Math.floor((ev.x - canvasPadding - b.left) / diam);
    let j = Math.floor((ev.y - canvasPadding - b.top) / diam);
    lastMouseBlock = [i, j];
    lastCtrlKey = ev.ctrlKey;

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
            if (surface.isCheckQubit(i, j, undefined, true)) {
                surface.holes[i][j] = !surface.holes[i][j];
                for (let [i2, j2] of surface.neighbors(i, j, true)) {
                    surface.updateDataHoleBasedOnNeighbors(i2, j2);
                }
            }
        }
    }

    surface.cycle();
    draw();
};
