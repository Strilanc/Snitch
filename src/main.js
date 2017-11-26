import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'
import {SurfaceCode} from 'src/sim/SurfaceCode.js'

let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');

let surface = new SurfaceCode(50, 30);

let diam = 20;
canvas.width = diam * surface.width;
canvas.height = diam * surface.height;

function draw() {
    let ctx = canvas.getContext('2d');
    for (let i = 0; i < surface.width; i++) {
        for (let j = 0; j < surface.height; j++) {
            let x = i*diam;
            let y = j*diam;
            if ((i & 1) !== (j & 1)) {
                ctx.fillStyle = '#FFF';
            } else if ((i & 1) === 0) {
                if (surface.last_result[i][j] === true) {
                    ctx.fillStyle = '#A62';
                } else if (surface.last_result[i][j] === false) {
                    ctx.fillStyle = '#DFD';
                }
            } else {
                if (surface.last_result[i][j] === true) {
                    ctx.fillStyle = '#F6F';
                } else if (surface.last_result[i][j] === false) {
                    ctx.fillStyle = '#DDF';
                }
            }
            ctx.fillRect(x, y, diam, diam);
        }
    }
}

setInterval(() => {
    surface.zero();
    surface.error();
    surface.cycle();
    draw();
}, 100);

canvas.onmousedown = ev => {
    let i = Math.floor(ev.x / diam);
    let j = Math.floor(ev.y / diam);
    if (i >= 0 && i < surface.width && j >= 0 && j < surface.height && ((i & 1) !== (j & 1))) {
        if (ev.button === 0) {
            surface.state.x(surface.qubits[i][j]);
        } else {
            surface.state.z(surface.qubits[i][j]);
        }
        surface.cycle();
        draw();
    }
};
