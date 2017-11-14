// setTimeout(() => location.reload(), 4000);

import {seq} from 'src/base/Seq.js'
import {DetailedError} from 'src/base/DetailedError.js'

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

let orFoldRowsShader = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D tex;
    void main() {
        float x = gl_FragCoord.x - 0.5;
        float y = gl_FragCoord.y - 0.5;
        vec2 loc1 = vec2(x*2.0 + 0.5 - 2.0, y) / size;
        vec2 loc2 = vec2(x*2.0 + 1.5 - 2.0, y) / size;
        bool val1 = texture(tex, loc1).x > 0.5;
        bool val2 = texture(tex, loc2).x > 0.5;
        outColor = float(val1 || val2);
    }`);

let findOneFoldRowsShader = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D tex;
    void main() {
        int x = int(gl_FragCoord.x);
        float fx = gl_FragCoord.x - 0.5;
        float y = gl_FragCoord.y - 0.5;
        vec2 loc1 = vec2(fx*2.0 + 0.5 - 2.0, y) / size;
        vec2 loc2 = vec2(fx*2.0 + 1.5 - 2.0, y) / size;
        int val1 = int(texture(tex, loc1).x * 255.0 + 0.5);
        int val2 = int(texture(tex, loc2).x * 255.0 + 0.5);
        if (val1 != 0) {
            outColor = float(val1 + x - 2) / 255.0;
        } else if (val2 != 0) {
            outColor = float(val2 + x + 1 - 2) / 255.0;
        } else {
            outColor = 0.0;
        }
    }`);

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

let measureSetResultShader = createFragProgram(`#version 300 es
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
    }`);

let tex_width = 64 * 2;
let tex_height = 64 * 2;
let width = 5;
let height = 5;

let {texture: tex_dst, frameBuffer: fb_dst} = allocTexture(tex_width, tex_height);
let {texture: tex_src, frameBuffer: fb_src} = allocTexture(tex_width, tex_height);
let {texture: tex_mid_src, frameBuffer: fb_mid_src} = allocTexture(tex_width, tex_height);
let {texture: tex_mid_dst, frameBuffer: fb_mid_dst} = allocTexture(tex_width, tex_height);
let last_tex = tex_dst;
let last_fb = fb_dst;

function* compute_or() {
    yield () => run_custom(true, orFoldRowsShader,
        ['tex', 'tex', tex_src],
        ['2f', 'size', tex_width, tex_height]);

    let w = Math.ceil(tex_width / 2);
    while (w > 1) {
        yield () => run_custom(true, orFoldRowsShader,
            ['tex', 'tex', tex_mid_src],
            ['2f', 'size', tex_width, tex_height]);
        w = Math.ceil(w / 2);
    }
}

function* compute_find() {
    yield () => run_custom(true, findOneFoldRowsShader,
        ['tex', 'tex', tex_src],
        ['2f', 'size', tex_width, tex_height]);

    let w = Math.ceil(tex_width / 2);
    while (w > 1) {
        yield () => run_custom(true, findOneFoldRowsShader,
            ['tex', 'tex', tex_mid_src],
            ['2f', 'size', tex_width, tex_height]);
        w = Math.ceil(w / 2);
    }
}

function kill_col(target) {
    return () => run(measureSetResultShader,
        ['tex', 'state', tex_src],
        ['tex', 'ors', tex_mid_src],
        ['1i', 'target', target],
        ['2f', 'size', tex_width, tex_height]);
}

function measure_set_result(target) {
    return () => run(measureSetResultShader,
        ['tex', 'state', tex_src],
        ['tex', 'ors', tex_mid_src],
        ['1i', 'target', target],
        ['2f', 'size', tex_width, tex_height]);
}

function swap_tex() {
    let tex_tmp = tex_src;
    let fb_tmp = fb_src;
    tex_src = tex_dst;
    fb_src = fb_dst;
    tex_dst = tex_tmp;
    fb_dst = fb_tmp;
}

function swap_mid_tex() {
    let tex_mid_tmp = tex_mid_src;
    let fb_mid_tmp = fb_mid_src;
    tex_mid_src = tex_mid_dst;
    fb_mid_src = fb_mid_dst;
    tex_mid_dst = tex_mid_tmp;
    fb_mid_dst = fb_mid_tmp;
}

function createShaderBinder(fragmentShaderSource, ...params) {
    let program = createFragProgram(fragmentShaderSource);
    return (...vals) => {
        let texture_unit = 0;
        if (vals.length !== params.length) {
            throw new DetailedError('Shader arg mismatch.', {vals, params});
        }
        for (let i = 0; i < vals.length; i++) {
            let [action, key] = params;
            let loc = gl.getUniformLocation(program, key);
            if (action === 'tex') {
                gl.uniform1i(loc, texture_unit);
                gl.activeTexture(gl.TEXTURE0 + texture_unit);
                gl.bindTexture(gl.TEXTURE_2D, ...vals);
                texture_unit++;
            } else {
                gl['uniform' + action](loc, ...vals);
            }
        }
    };
}

function run_custom(key, program, ...combos) {
    gl.useProgram(program);
    let texture_unit = 0;
    for (let [action, key, ...vals] of combos) {
        let loc = gl.getUniformLocation(program, key);
        if (action === 'tex') {
            gl.uniform1i(loc, texture_unit);
            gl.activeTexture(gl.TEXTURE0 + texture_unit);
            gl.bindTexture(gl.TEXTURE_2D, vals[0]);
            texture_unit++;
        } else {
            gl['uniform' + action](loc, ...vals);
        }
    }
    if (key) {
        drawToTexture(program, fb_mid_dst, tex_width, tex_height);
        swap_mid_tex();
        last_tex = tex_mid_src;
        last_fb = fb_mid_src;
    } else {
        drawToTexture(program, fb_dst, tex_width, tex_height);
        swap_tex();
        last_tex = tex_src;
        last_fb = fb_src;
    }
}

function run(program, ...combos) {
    run_custom(false, program, ...combos);
}

function h(a) {
    return () => run(applyHOperationShader,
        ['tex', 'tex', tex_src],
        ['1i', 'target', a],
        ['2f', 'size', tex_width, tex_height]);
}

function cz(a, b) {
    return () => run(applyCzOperationShader,
        ['tex', 'tex', tex_src],
        ['1i', 'target1', a],
        ['1i', 'target2', b],
        ['2f', 'size', tex_width, tex_height]);
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
    () => run(prepareCleanStateShader,
        ['2f', 'size', tex_width, tex_height]),
    ...cycle()
];

let step_index = 0;
canvas.width = tex_width*4;
canvas.height = tex_height*4;
setInterval(() => {
    if (step_index < steps.length) {
        steps[step_index]();
    }
    step_index++;
    if (step_index >= steps.length + 100) {
        step_index = 0;
    }

    gl.useProgram(showShader);
    gl.uniform1i(gl.getUniformLocation(showShader, 'tex'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, last_tex);
    gl.uniform2f(gl.getUniformLocation(showShader, 'tex_size'), tex_width, tex_height);
    gl.uniform2f(gl.getUniformLocation(showShader, 'out_size'), canvas.width, canvas.height);
    drawProgramToCanvas();
}, 10);
