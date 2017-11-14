import {seq} from 'src/base/Seq.js'
import {DetailedError} from 'src/base/DetailedError.js'

import {init, createFragProgram, drawToTexture, readTexture, TexPair, Tex} from 'src/sim/Gpu.js'
let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');
let gl = init(canvas);

// import {GpuBinaryMat} from 'src/sim/GpuMat.js'


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

class ParametrizedShader {
    constructor(fragmentShaderSource, ...params) {
        this.program = createFragProgram(fragmentShaderSource);
        this.params = params;
    }

    withArgs(...args) {
        return new ParametrizedShaderWithArgs(this, args);
    }

    useArgs(...args) {
        let params = this.params;
        let program = this.program;
        gl.useProgram(program);
        if (args.length !== params.length) {
            throw new DetailedError('Shader arg mismatch.', {args, params});
        }
        let texture_unit = 0;
        for (let i = 0; i < args.length; i++) {
            let param = params[i];
            let action = param[0];
            let key = param[1];
            let arg = args[i];
            let spread = param.length >= 2 && param[2];
            let loc = gl.getUniformLocation(program, key);
            if (action === 'tex') {
                gl.uniform1i(loc, texture_unit);
                gl.activeTexture(gl.TEXTURE0 + texture_unit);
                gl.bindTexture(gl.TEXTURE_2D, arg.texture);
                texture_unit++;
                if (param.length >= 2 && param[2] !== undefined) {
                    gl.uniform2f(gl.getUniformLocation(program, param[2]), arg.width, arg.height);
                }
            } else if (spread) {
                gl['uniform' + action](loc, ...arg);
            } else {
                gl['uniform' + action](loc, arg);
            }
        }
    }
}

class ParametrizedShaderWithArgs {
    constructor(parametrizedShader, args) {
        this.parametrizedShader = parametrizedShader;
        this.args = args;
    }

    renderIntoTexPair(texPair) {
        this.parametrizedShader.useArgs(...this.args);
        drawToTexture(this.parametrizedShader.program, texPair.dst, texPair.dst.width, texPair.dst.height);
        texPair.swap();
    }

    drawToCanvas() {
        this.parametrizedShader.useArgs(...this.args);
        gl.useProgram(this.parametrizedShader.program);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

}

/**
 * @param {!Array.<!int>} size
 */
let prepareCleanStateShader = new ParametrizedShader(`#version 300 es
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
    }`,
    ['2f', 'size', true]);

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

/**
 * @param {!Tex} tex
 * @param {!int} target
 */
let applyHOperationShader = new ParametrizedShader(`#version 300 es
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
    }`,
    ['tex', 'tex', 'size'],
    ['1i', 'target']);

/**
 * @param {!Tex} tex
 * @param {!int} target1
 * @param {!int} target2
 */
let applyCzOperationShader = new ParametrizedShader(`#version 300 es
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
    }`,
    ['tex', 'tex', 'size'],
    ['1i', 'target1'],
    ['1i', 'target2']);

let orFoldRowsShader = new ParametrizedShader(`#version 300 es
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
    }`,
    ['tex', 'tex', 'size']);

let findOneFoldRowsShader = new ParametrizedShader(`#version 300 es
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
    }`,
    ['tex', 'tex', 'size']);

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
    yield () => orFoldRowsShader.withArgs(sim_state.src).renderIntoTexPair(fold_state);

    let w = Math.ceil(sim_state.src.width / 2);
    while (w > 1) {
        yield () => orFoldRowsShader.withArgs(fold_state.src).renderIntoTexPair(fold_state);
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
    return () => applyHOperationShader.withArgs(sim_state.src, a).renderIntoTexPair(sim_state);
}

function cz(a, b) {
    return () => applyCzOperationShader.withArgs(sim_state.src, a, b).renderIntoTexPair(sim_state);
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
    () => prepareCleanStateShader.withArgs([tex_width, tex_height]).renderIntoTexPair(sim_state),
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
