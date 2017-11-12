import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'

let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');

let width = 50;
let height = 30;
let state = new StabilizerCircuitState();
let qubits = [];
let last_result = [];
let target = state.add_off_qubit();
for (let i = 0; i < width; i++) {
    let r = [];
    let m = [];
    for (let j = 0; j < height; j++) {
        if ((i & 1) !== (j & 1)) {
            r.push(state.add_off_qubit());
        } else {
            r.push(target);
        }
        m.push(undefined);
    }
    qubits.push(r);
    last_result.push(m);
}

function neighbors(i, j) {
    let result = [];
    for (let [di, dj] of [[1,0], [-1,0], [0,1], [0,-1]]) {
        let i2 = i + di;
        let j2 = j + dj;
        if (i2 >= 0 && i2 < width && j2 >= 0 && j2 < height) {
            result.push([i2, j2]);
        }
    }
    return result;
}

function square_measure(i, j, h) {
    let t = qubits[i][j];
    state.h(t);
    for (let [x, y] of neighbors(i, j)) {
        let c = qubits[x][y];
        if (h) {
            state.h(c);
        }
        state.cz(c, t);
        if (h) {
            state.h(c);
        }
    }
    state.h(t);
    let v = state.measure(t, true);
    return v;
}

function cycle() {
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            if ((i & 1) === (j & 1)) {
                last_result[i][j] = square_measure(i, j, (i & 1) === 1);
            }
        }
    }
}

let diam = 20;
canvas.width = diam * width;
canvas.height = diam * height;

function error(p = 0.01) {
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            if (Math.random() < p) {
                if (Math.random() < 0.5) {
                    state.x(qubits[i][j]);
                }
                if (Math.random() < 0.5) {
                    state.z(qubits[i][j]);
                }
            }
        }
    }
}

function zero() {
    for (let i = 0; i < width; i += 2) {
        let b = false;
        for (let j = 0; j < height; j += 2) {
            b ^= last_result[i][j] === true;
            if (b && j < height - 1) {
                state.x(qubits[i][j+1]);
            }
        }
    }

    let max_i = (width - (width % 1)) - 1;
    for (let j = 1; j < height; j += 2) {
        let b = false;
        for (let i = max_i; i >= 0; i -= 2) {
            b ^= last_result[i][j] === true;
            if (b && i > 0) {
                state.z(qubits[i-1][j]);
            }
        }
    }
}

function draw() {
    let ctx = canvas.getContext('2d');
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            let x = i*diam;
            let y = j*diam;
            if ((i & 1) !== (j & 1)) {
                ctx.fillStyle = '#FFF';
            } else if ((i & 1) === 0) {
                if (last_result[i][j] === true) {
                    ctx.fillStyle = '#A62';
                } else if (last_result[i][j] === false) {
                    ctx.fillStyle = '#DFD';
                }
            } else {
                if (last_result[i][j] === true) {
                    ctx.fillStyle = '#F6F';
                } else if (last_result[i][j] === false) {
                    ctx.fillStyle = '#DDF';
                }
            }
            ctx.fillRect(x, y, diam, diam);
        }
    }
}

setInterval(() => {
    zero();
    error();
    cycle();
    draw();
}, 100);

canvas.onmousedown = ev => {
    let i = Math.floor(ev.x / diam);
    let j = Math.floor(ev.y / diam);
    if (i >= 0 && i < width && j >= 0 && j < height && ((i & 1) !== (j & 1))) {
        if (ev.button === 0) {
            state.x(qubits[i][j]);
        } else {
            state.z(qubits[i][j]);
        }
        cycle();
        draw();
    }
};
