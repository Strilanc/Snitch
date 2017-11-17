import {seq} from 'src/base/Seq.js'
import {DetailedError} from 'src/base/DetailedError.js'
import {describe} from 'src/base/Describe.js'

import {initGpu, ParametrizedShader, readTexture, TexPair, Tex} from 'src/sim/Gpu.js'
import {randomAdvance} from 'src/gen/randomAdvance.js'
import {shifter} from 'src/gen/shifter.js'
import {orFold} from 'src/gen/orFold.js'
import {singleHadamard} from 'src/gen/singleHadamard.js'
import {singleCZ} from 'src/gen/singleCZ.js'
import {prepareCleanState} from 'src/gen/prepareCleanState.js'
import {measureSetResult} from 'src/gen/measureSetResult.js'
import {findOneFold} from 'src/gen/findOneFold.js'

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

let sim_state = new TexPair(128, 128);
let fold_state = new TexPair(sim_state.src.width, sim_state.src.height);

let rng_seed = new Uint8Array(4 * sim_state.src.height);
for (let i = 0; i < rng_seed.length; i++) {
    rng_seed[i] = Math.floor(Math.random() * 256);
}
console.log(rng_seed);
let rng_state = new TexPair(4, sim_state.src.height, rng_seed);

function* compute_or() {
    yield () => shifter.withArgs([-2, 0], sim_state.src).renderIntoTexPair(fold_state);

    let w = Math.ceil(sim_state.src.width - 2);
    while (w > 1) {
        yield () => orFold.withArgs(fold_state.src).renderIntoTexPair(fold_state);
        w = Math.ceil(w / 2);
    }
}

//noinspection JSUnusedLocalSymbols
function* compute_find() {
    yield () => shifter.withArgs([-2, 0], sim_state.src).renderIntoTexPair(fold_state);

    let w = Math.ceil(sim_state.src.width - 2);
    while (w > 1) {
        yield () => findOneFold.withArgs(fold_state.src).renderIntoTexPair(fold_state);
        w = Math.ceil(w / 2);
    }
}

function measure_set_result(target) {
    return () => measureSetResult.withArgs(target, fold_state.src, rng_state.src, sim_state.src).renderIntoTexPair(sim_state);
}

function h(a) {
    return () => singleHadamard.withArgs(a, sim_state.src).renderIntoTexPair(sim_state);
}

function cz(a, b) {
    return () => singleCZ.withArgs(a, b, sim_state.src).renderIntoTexPair(sim_state);
}

let surface_width = 5;
let surface_height = 5;

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

// eslint-disable-next-line
function* cycle() {
    for (let i = 0; i < surface_width; i++) {
        for (let j = 0; j < surface_height; j++) {
            if ((i & 1) === (j & 1)) {
                continue; // Data qubit.
            }
            yield h(q(i, j));
            for (let [x, y] of neighbors(i, j)) {
                if ((i & 1) === 0) {
                    yield h(q(x, y));
                    yield cz(q(i, j), q(x, y));
                    yield h(q(x, y));
                } else {
                    yield cz(q(i, j), q(x, y));
                }
            }
            yield h(q(i, j));
        }
    }

    yield* compute_or();

    for (let i = 0; i < surface_width; i++) {
        for (let j = 0; j < surface_height; j++) {
            if ((i & 1) !== (j & 1)) {
                yield measure_set_result(q(i, j));
            }
        }
    }
}

let steps = [
    () => prepareCleanState.withArgs().renderIntoTexPair(sim_state),
    () => randomAdvance.withArgs(rng_state).renderIntoTexPair(rng_state),
    ...cycle()
];

let step_index = 0;
canvas.width = sim_state.src.width*4;
canvas.height = sim_state.src.height*4;
setInterval(() => {
    if (step_index < steps.length) {
        steps[step_index]();
    }
    step_index++;
    if (step_index >= steps.length + 100) {
        step_index = 0;
    }

    showShader.withArgs(sim_state.src, [canvas.width, canvas.height]).drawToCanvas();
}, 10);

window.onerror = function(msg, url, line, col, error) {
    document.getElementById('err_msg').textContent = describe(msg);
    document.getElementById('err_line').textContent = describe(line);
    document.getElementById('err_time').textContent = '' + new Date().getMilliseconds();
    if (error instanceof DetailedError) {
        document.getElementById('err_gen').textContent = describe(error.details);
    }
};
