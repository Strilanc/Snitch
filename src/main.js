setTimeout(() => location.reload(), 4000);

import {seq, Seq} from 'src/base/Seq.js'
import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'

import {init, createFragProgram, drawProgramToCanvas, drawToTexture, allocTexture, readTexture} from 'src/sim/Gpu.js'
let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');
let gl = init(canvas);

// import {GpuBinaryMat} from 'src/sim/GpuMat.js'


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

let prepareCleanStateShader = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        outColor = float(x*2 == y + 4);
        if (x == 0 && (y & 1) == 1) {
            outColor = 0.5;
        }
    }`);

let showShader = createFragProgram(`#version 300 es
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
    }`);

let applyXOperationShader = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D tex;
    uniform int target;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        vec2 xy = gl_FragCoord.xy / size;
        bool prev = texture(tex, xy).x > 0.5;
        bool update_sign_y = x == 0 && y == target * 2;
        bool update_sign_z = x == 1 && y == target * 2 + 1;
        bool update = update_sign_y || update_sign_z;
        outColor = float(prev != update);
        if (x == 0 && (y & 1) == 1) {
            outColor = 0.5;
        }
    }`);

let applyHOperationShader = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D tex;
    uniform int target;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        vec2 xy = gl_FragCoord.xy / size;
        bool prev = texture(tex, xy).x > 0.5;
        int other_index = y ^ 1;
        vec2 other_loc = vec2(xy.x, float(other_index) / size.y);
        bool other_val = texture(tex, other_loc).x > 0.5;
        outColor = float(target * 2 == y || target * 2 + 1 == y ? other_val : prev);
        if (x == 0 && target * 2 == y) {
            outColor = float(!prev);
        }
        if (x == 0 && (y & 1) == 1) {
            outColor = 0.5;
        }
    }`);

let applyCzOperationShader = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D tex;
    uniform int target1;
    uniform int target2;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        vec2 xy = gl_FragCoord.xy / size;
        bool prev = texture(tex, xy).x > 0.5;
        int other_index = (target1 + target2) * 2 - y + 1;
        vec2 other_loc = vec2(xy.x, float(other_index) / size.y);
        bool other_val = texture(tex, other_loc).x > 0.5;
        bool is_target_x_obs = y == target1 * 2 || y == target2 * 2;
        bool flip = other_val && is_target_x_obs && x > 0;
        outColor = float(prev != flip);
        if (x == 0 && (y & 1) == 1) {
            outColor = 0.5;
        }
    }`);

let tex_width = 64 * 2;
let tex_height = 64 * 2;

let {texture: tex_dst, frameBuffer: fb_dst} = allocTexture(tex_width, tex_height);
let {texture: tex_src, frameBuffer: fb_src} = allocTexture(tex_width, tex_height);

function swap_tex() {
    let tex_tmp = tex_src;
    let fb_tmp = fb_src;
    tex_src = tex_dst;
    fb_src = fb_dst;
    tex_dst = tex_tmp;
    fb_dst = fb_tmp;
}

function run(program, ...combos) {
    gl.useProgram(program);
    for (let [action, key, ...vals] of combos) {
        let loc = gl.getUniformLocation(program, key);
        if (action === '1i_tex') {
            gl.uniform1i(loc, ...vals);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex_src);
        } else {
            gl['uniform' + action](loc, ...vals);
        }
    }
    drawToTexture(program, tex_dst, fb_dst, tex_width, tex_height);
    swap_tex();
}

function h(a) {
    return () => run(applyHOperationShader,
        ['1i_tex', 'tex', 0],
        ['1i', 'target', a],
        ['2f', 'size', tex_width, tex_height]);
}

function cz(a, b) {
    return () => run(applyCzOperationShader,
        ['1i_tex', 'tex', 0],
        ['1i', 'target1', a],
        ['1i', 'target2', b],
        ['2f', 'size', tex_width, tex_height]);
}

let steps = [
    () => run(prepareCleanStateShader,
        ['2f', 'size', tex_width, tex_height]),

    () => run(applyXOperationShader,
        ['1i_tex', 'tex', 0],
        ['1i', 'target', 5],
        ['2f', 'size', tex_width, tex_height]),

    ...Seq.range(20).map(h),
    ...Seq.range(10).map(i => cz(i, i + 10)),
    ...Seq.range(10).map(h),
];

let step_index = 0;
canvas.width = tex_width*4;
canvas.height = tex_height*4;
setInterval(() => {
    if (step_index < steps.length) {
        steps[step_index]();
    }
    step_index++;
    if (step_index >= steps.length + 10) {
        step_index = 0;
    }

    gl.useProgram(showShader);
    gl.uniform1i(gl.getUniformLocation(showShader, 'tex'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex_src);
    gl.uniform2f(gl.getUniformLocation(showShader, 'tex_size'), tex_width, tex_height);
    gl.uniform2f(gl.getUniformLocation(showShader, 'out_size'), canvas.width, canvas.height);
    drawProgramToCanvas();
}, 20);

