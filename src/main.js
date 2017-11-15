import {seq} from 'src/base/Seq.js'
import {DetailedError} from 'src/base/DetailedError.js'

import {initGpu, createFragProgram, ParametrizedShader, readTexture, TexPair, Tex} from 'src/sim/Gpu.js'
import {orFold} from 'src/gen/orFold.js'
import {singleHadamard} from 'src/gen/singleHadamard.js'
import {singleCZ} from 'src/gen/singleCZ.js'
import {prepareCleanState} from 'src/gen/prepareCleanState.js'

let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');
initGpu(canvas);

//noinspection JSUnusedLocalSymbols
function read(t, w, h, fb) {
    let vals = readTexture(t, w, h, fb);
    let r = [];
    for (let j = 0; j < h; j++) {
        let s = [];
        for (let i = 0; i < w; i++) {
            s.push(vals[j*w + i] !== 0 ? '1' : '_');
        }
        r.push(seq(s).join(''));
    }
    return seq(r).join('\n');
}

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
        vec4 v = texture(tex, vec2(gl_FragCoord.x, out_size.y-gl_FragCoord.y) / out_size);
        float r = v.x;
        outColor = vec4(r, r, r, 1.0);
    }`,
    ['tex', 'tex', 'tex_size'],
    ['2f', 'out_size', true]);

//noinspection JSUnusedLocalSymbols
let killColShader = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D state;
    uniform sampler2D mux;
    uniform int target;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        vec2 xy = gl_FragCoord.xy / size;
        float ty = (float(target)*2.0+1.0+0.5)/ size.y;
        float prev_f = texture(state, xy).x;
        bool prev = prev_f > 0.5;
        bool mask = texture(state, vec2(xy.x, ty)).x > 0.5;
        int index = int(texture(mux, vec2(2.5/size.x, xy.y)).x * 255.0 + 0.5);
        index += 1;
        bool fix = texture(state, vec2((float(index) + 0.5) / size.x, ty)).x > 0.5;
        outColor = prev_f;
        if (x >= 1 && index >= 2) {
            // there was a variable present
            outColor = float((fix && mask) != prev);
        }
    }`);

let measureSetResultShader = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D state;
    uniform sampler2D ors;
    uniform int target;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        vec2 xy = gl_FragCoord.xy / size;
        float prev_f = texture(state, xy).x;
        bool prev = prev_f > 0.5;
        outColor = prev_f;
        bool any = texture(ors, vec2(2.5 / size.x, xy.y)).x > 0.5;
        if (y == target*2 + 1) {
            bool rand = sin(xy.y * xy.y * 432.3) > 0.0;  // TODO: actually make it random.
            if (x == 0) {
                outColor = float(rand);
            } else if (x == 1) {
                outColor = float(prev != rand);
            }
        }
    }`,
    ['tex', 'state', 'size'],
    ['tex', 'ors'],
    ['1i', 'target']);

let tex_width = 64 * 2;
let tex_height = 64 * 2;
let width = 5;
let height = 5;

let sim_state = new TexPair(tex_width, tex_height);
let fold_state = new TexPair(tex_width, tex_height);

function* compute_or() {
    yield () => orFold.withArgs(sim_state.src).renderIntoTexPair(fold_state);

    let w = Math.ceil(sim_state.src.width / 2);
    while (w > 1) {
        yield () => orFold.withArgs(fold_state.src).renderIntoTexPair(fold_state);
        w = Math.ceil(w / 2);
    }
}

//noinspection JSUnusedLocalSymbols
function* compute_find() {
    yield () => findOneFoldRowsShader.withArgs(sim_state.src).renderIntoTexPair(fold_state);

    let w = Math.ceil(sim_state.src.width / 2);
    while (w > 1) {
        yield () => findOneFoldRowsShader.withArgs(fold_state.src).renderIntoTexPair(fold_state);
        w = Math.ceil(w / 2);
    }
}

function measure_set_result(target) {
    return () => measureSetResultShader.withArgs(sim_state.src, fold_state.src, target).renderIntoTexPair(sim_state);
}

function h(a) {
    return () => singleHadamard.withArgs(a, sim_state.src).renderIntoTexPair(sim_state);
}

function cz(a, b) {
    return () => singleCZ.withArgs(a, b, sim_state.src).renderIntoTexPair(sim_state);
}

function neighbors(i, j) {
    let result = [];
    for (let [x, y] of [[i-1, j], [i+1, j], [i, j-1], [i, j+1]]) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            result.push([x, y]);
        }
    }
    return result;
}

function q(x, y) {
    return x + y*width;
}

// eslint-disable-next-line
function* cycle() {
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
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

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            if ((i & 1) !== (j & 1)) {
                yield measure_set_result(q(i, j));
            }
        }
    }
}

let steps = [
    () => prepareCleanState.withArgs().renderIntoTexPair(sim_state),
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
