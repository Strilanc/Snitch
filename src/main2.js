import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'

import {initGpu, createFragProgram, drawProgramToCanvas, drawToTexture, allocTexture, readTexture} from 'src/sim/Gpu.js'
let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('main-canvas');
let gl = initGpu(canvas);

import {GpuBinaryMat} from 'src/sim/GpuMat.js'

let program = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out vec4 outColor;
    uniform float u;
    uniform sampler2D t;
    void main() {
        vec4 v = gl_FragCoord;
        int i = 3;
        int j = 1;
        int k = i ^ j;
        if (k == 2 && v.x < u*128.0) {
            outColor = texture(t, v.xy/256.0);
        } else {
            outColor = vec4(v.x/256.0, 1.0-u, v.y/256.0, 1);
        }
    }`);
let program2 = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    void main() {
        outColor = gl_FragCoord.x / 255.0 + gl_FragCoord.y / 255.0;
    }`);

let tex = allocTexture(256, 256);
drawToTexture(program2, tex, 256, 256);

canvas.width = 256;
canvas.height = 256;
let t = 0;
function redraw() {
    t += 0.02;
    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(program, 't'), 0);
    gl.uniform1f(gl.getUniformLocation(program, "u"), Math.cos(t) / 2.0 + 0.5);
    drawProgramToCanvas();
    requestAnimationFrame(redraw);
}
requestAnimationFrame(redraw);
