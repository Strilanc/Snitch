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
let canvas_padding = 10;
canvas.width = diam * surface.width + canvas_padding*2;
canvas.height = diam * surface.height + canvas_padding*2;

const X_ON_COLOR = '#55F';
const X_BORDER_COLOR = '#55F';
const X_OFF_COLOR = '#E6E6FF';

const Z_ON_COLOR = '#0A0';
const Z_BORDER_COLOR = '#0A0';
const Z_OFF_COLOR = '#DFD';

const D_COLOR = '#FFF';
const H_COLOR = '#000';

function draw() {
    let ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas_padding, canvas_padding);

    drawQubitBlocks(ctx);
    drawHoleBorders(ctx);
    drawErrorCurves(ctx);

    ctx.restore();
}

function drawQubitBlocks(ctx) {
    for (let [i, j] of surface.points) {
        let x = i * diam;
        let y = j * diam;
        let b = surface.last_result[i][j];
        if (surface.isDataQubit(i, j)) {
            ctx.fillStyle = D_COLOR;
        } else if (surface.isZCheckQubit(i, j)) {
            ctx.fillStyle = b ? Z_ON_COLOR : Z_OFF_COLOR;
        } else if (surface.isXCheckQubit(i, j)) {
            ctx.fillStyle = b ? X_ON_COLOR : X_OFF_COLOR;
        } else {
            ctx.fillStyle = H_COLOR;
        }
        ctx.fillRect(x, y, diam, diam);
    }
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

function drawErrorCurves(ctx) {
    for (let xz of [false, true]) {
        ctx.beginPath();
        let flips = surface.xzFlips(xz);
        for (let [i, j] of surface.dataPoints()) {
            let x = i * diam + 0.5;
            let y = j * diam + 0.5;

            if (flips[i][j]) {
                if (surface.isXCheckRow(j) === xz) {
                    ctx.moveTo(x + diam / 2, y - diam / 2);
                    ctx.lineTo(x + diam / 2, y + diam * 3 / 2);
                } else {
                    ctx.moveTo(x - diam / 2, y + diam / 2);
                    ctx.lineTo(x + diam * 3 / 2, y + diam / 2);
                }
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

document.onkeydown = ev => {
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

canvas.onmousedown = ev => {
    ev.preventDefault();
    let b = canvas.getBoundingClientRect();
    let i = Math.floor((ev.x - canvas_padding - b.left) / diam);
    let j = Math.floor((ev.y - canvas_padding - b.top) / diam);
    if (ev.ctrlKey) {
        if (i >= 0 && i < surface.width && j >= 0 && j < surface.height) {
            if (ev.button === 0) {
                surface.holes[i][j] ^= true;
                if (surface.holes[i][j]) {
                    if (surface.isDataQubit(i, j)) {
                        surface.measure(i, j);
                    }
                    surface.xFlips[i][j] = false;
                    surface.zFlips[i][j] = false;
                }

            }
        }
    } else {
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

        for (let xz of [false, true]) {
            if (surface.isCheckQubit(i, j, xz)) {
                for (let [i2, j2] of surface.neighbors(i, j)) {
                    surface.doXZ(i2, j2, xz, ev.altKey);
                }
            }
        }
    }

    surface.cycle();
    draw();
};
