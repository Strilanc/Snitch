// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {DetailedError} from "src/base/DetailedError.js";

//noinspection JSValidateJSDoc
let gl = /** @type {!WebGL2RenderingContext} */  undefined;
//noinspection JSValidateJSDoc
let vertexShader = /** @type {!WebGLShader} */ undefined;
//noinspection JSValidateJSDoc
let frameBuffer = /** @type {!WebGLFramebuffer} */ undefined;

function init(canvas) {
    gl = canvas.getContext('webgl2');

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
        -1.0, 1.0,
        1.0, -1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0,
    ]), gl.STATIC_DRAW);
    //noinspection JSUnresolvedFunction
    gl.bindVertexArray(gl.createVertexArray());

    vertexShader = createShader(gl.VERTEX_SHADER, `#version 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position;
        }`);

    frameBuffer = gl.createFramebuffer();

    return gl;
}

function allocTexture(w, h) {
    let tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    //noinspection JSUnresolvedVariable
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

function drawToTexture(program, t, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function readTexture(t, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    let outputBuffer = new Uint8Array(w * h);
    //noinspection JSUnresolvedVariable
    gl.readPixels(0, 0, w, h, gl.RED, gl.UNSIGNED_BYTE, outputBuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outputBuffer;
}

function drawProgramToCanvas() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function createShader(type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        let getShaderInfoLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        console.warn(getShaderInfoLog);
        throw new DetailedError('Bad shader', {getShaderInfoLog});
    }
    return shader;
}

function createFragProgram(fragmentShaderSource) {
    let fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        let getProgramInfoLog = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new DetailedError('Bad program', {getProgramInfoLog});
    }

    //noinspection JSUnresolvedFunction
    let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    return program;
}

export {init, createFragProgram, drawProgramToCanvas, drawToTexture, allocTexture, readTexture}
