import {seq} from 'src/base/Seq.js'
import {DetailedError} from 'src/base/DetailedError.js'
import {describe} from 'src/base/Describe.js'
import {initGpu, ParametrizedShader, readTexture, TexPair, Tex} from 'src/sim/Gpu.js'
import {createPrng, advancePrng, advanceMeasureWithReset} from 'src/sim/Operations.js'
import {randomAdvance} from 'src/gen/randomAdvance.js'
import {shifter} from 'src/gen/shifter.js'
import {orFold} from 'src/gen/orFold.js'
import {singleHadamard} from 'src/gen/singleHadamard.js'
import {singleCZ} from 'src/gen/singleCZ.js'
import {prepareCleanState} from 'src/gen/prepareCleanState.js'
import {measureSetResult} from 'src/gen/measureSetResult.js'
import {findOneFold} from 'src/gen/findOneFold.js'

window.onerror = function(msg, url, line, col, error) {
    document.getElementById('err_msg').textContent = describe(msg);
    document.getElementById('err_line').textContent = describe(line);
    document.getElementById('err_time').textContent = '' + new Date().getMilliseconds();
    if (error instanceof DetailedError) {
        document.getElementById('err_gen').textContent = describe(error.details);
    }
};

let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');
initGpu(canvas);

/**
 * @param {!Tex} tex
 * @param {!Array.<!int>} out_size
 */
let showShader = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    out vec4 outColor;
    uniform sampler2D tex;
    uniform vec2 tex_size;
    uniform vec2 out_size;
    void main() {
        float r = texture(tex, vec2(gl_FragCoord.x, out_size.y-gl_FragCoord.y) / out_size).x;
        outColor = vec4(r, r, r, 1.0);
    }`,
    ['tex', 'tex', 'tex_size'],
    ['2f', 'out_size', true]);

function h(a) {
    singleHadamard.withArgs(a, sim_state.src).renderInto(sim_state);
}

function cz(a, b) {
    singleCZ.withArgs(a, b, sim_state.src).renderInto(sim_state);
}

function neighbors(i, j) {
    let result = [];
    for (let [x, y] of [[i-1, j], [i+1, j], [i, j-1], [i, j+1]]) {
        if (x >= 0 && x < surface_width && y >= 0 && y < surface_height) {
            result.push([x, y]);
        }
    }
    return result;
}

function q(x, y) {
    return x + y*surface_width;
}

let sim_state;
let fold_state;
let rng_state;

// eslint-disable-next-line
function cycle() {
    for (let i = 0; i < surface_width; i++) {
        for (let j = 0; j < surface_height; j++) {
            if ((i & 1) === (j & 1)) {
                continue; // Data qubit.
            }
            h(q(i, j));
            for (let [x, y] of neighbors(i, j)) {
                if ((i & 1) === 0) {
                    h(q(x, y));
                    cz(q(i, j), q(x, y));
                    h(q(x, y));
                } else {
                    cz(q(i, j), q(x, y));
                }
            }
            h(q(i, j));
        }
    }
    for (let i = 0; i < surface_width; i++) {
        for (let j = 0; j < surface_height; j++) {
            if ((i & 1) !== (j & 1)) {
                advanceMeasureWithReset(sim_state, fold_state, rng_state, q(i, j));
            }
        }
    }
}

let surface_width = 5;
//noinspection JSSuspiciousNameCombination
let surface_height = surface_width;
let area = surface_width * surface_height;

setTimeout(() => {
    sim_state = new TexPair(area, area * 2);
    fold_state = new TexPair(sim_state.src.width, sim_state.src.height);
    rng_state = createPrng(sim_state.src.height);
    canvas.width = sim_state.width * 3;
    canvas.height = sim_state.height * 3;
    console.log(canvas.height);

    console.log('starting');
    prepareCleanState.withArgs().renderInto(sim_state);
    console.log('prepared initial state');
    cycle();
    console.log('spinup done');
    let cycles = 1;
    let dt = 0;
    while (dt < 500) {
        cycles *= 2;
        console.log(`too fast (${dt}). Retrying with cycles=${cycles}`);
        let startTime = new Date();
        for (let i = 0; i < cycles; i++) {
            cycle();
        }
        let endTime = new Date();
        dt = endTime - startTime;
        // showShader.withArgs(sim_state, [canvas.width, canvas.height]).drawToCanvas();
    }
    console.log(`${surface_width}x${surface_height}: ${cycles} cycles in ${dt}ms, or ${(cycles / dt * 1000).toFixed(1)} Hz, or ${(cycles * surface_width * surface_height / dt).toFixed(1)} qubit*kHz`)
}, 0);
