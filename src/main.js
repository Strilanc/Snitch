setTimeout(() => location.reload(), 1000);

import {seq} from 'src/base/Seq.js'
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

let {texture: tex, frameBuffer: fb1} = allocTexture(tex_width, tex_height);
gl.useProgram(showShader);
gl.uniform2f(gl.getUniformLocation(prepareCleanStateShader, 'size'), tex_width, tex_height);
drawToTexture(prepareCleanStateShader, tex, fb1, tex_width, tex_height);

let {texture: tex2, frameBuffer: fb2} = allocTexture(tex_width, tex_height);
gl.useProgram(applyXOperationShader);
gl.uniform1i(gl.getUniformLocation(applyXOperationShader, 'tex'), 0);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.uniform1i(gl.getUniformLocation(applyXOperationShader, 'target'), 5);
gl.uniform2f(gl.getUniformLocation(applyXOperationShader, 'size'), tex_width, tex_height);
drawToTexture(applyXOperationShader, tex2, fb2, tex_width, tex_height);

let {texture: tex3, frameBuffer: fb3} = allocTexture(tex_width, tex_height);
gl.useProgram(applyHOperationShader);
gl.uniform1i(gl.getUniformLocation(applyHOperationShader, 'tex'), 0);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex2);
gl.uniform1i(gl.getUniformLocation(applyHOperationShader, 'target'), 8);
gl.uniform2f(gl.getUniformLocation(applyHOperationShader, 'size'), tex_width, tex_height);
drawToTexture(applyHOperationShader, tex3, fb3, tex_width, tex_height);

let {texture: tex4, frameBuffer: fb4} = allocTexture(tex_width, tex_height);
gl.useProgram(applyCzOperationShader);
gl.uniform1i(gl.getUniformLocation(applyCzOperationShader, 'tex'), 0);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex3);
gl.uniform1i(gl.getUniformLocation(applyCzOperationShader, 'target1'), 8);
gl.uniform1i(gl.getUniformLocation(applyCzOperationShader, 'target2'), 15);
gl.uniform2f(gl.getUniformLocation(applyCzOperationShader, 'size'), tex_width, tex_height);
drawToTexture(applyCzOperationShader, tex4, fb4, tex_width, tex_height);

canvas.width = tex_width*4;
canvas.height = tex_height*4;
gl.useProgram(showShader);
gl.uniform1i(gl.getUniformLocation(showShader, 'tex'), 0);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex4);
gl.uniform2f(gl.getUniformLocation(showShader, 'tex_size'), tex_width, tex_height);
gl.uniform2f(gl.getUniformLocation(showShader, 'out_size'), canvas.width, canvas.height);
drawProgramToCanvas();
