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

function initGpu(canvas) {
    gl = canvas.getContext('webgl2');

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        1.0, 1.0,
        1.0, -1.0,
        -1.0, 1.0,
        1.0, -1.0,
        -1.0, 1.0,
        -1.0, -1.0,
    ]), gl.STATIC_DRAW);
    //noinspection JSUnresolvedFunction
    gl.bindVertexArray(gl.createVertexArray());

    vertexShader = createShader(gl.VERTEX_SHADER, `#version 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position;
        }`);

    return gl;
}

class Tex {
    constructor(width, height) {
        let {texture, frameBuffer} = Tex.allocTexture(width, height);
        this.width = width;
        this.height = height;
        this.texture = texture;
        this.frameBuffer = frameBuffer;
    }

    static allocTexture(w, h) {
        let texture = gl.createTexture();
        let frameBuffer = gl.createFramebuffer();

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        try {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            //noinspection JSUnresolvedVariable
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, null);
            checkGetErrorResult(gl, "texImage2D");
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            checkGetErrorResult(gl, "framebufferTexture2D");
            checkFrameBufferStatusResult(gl);
        } finally {
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        return {texture, frameBuffer};
    }
}

/**
 * Checks if the given code, returned by gl.getError, is an error or not.
 * Throws an error with a descriptive message if the code represents an error.
 * @param {!WebGL2RenderingContext} gl
 * @param {!string} previousOperationDescription
 */
function checkGetErrorResult(gl, previousOperationDescription) {
    //noinspection JSUnresolvedFunction
    let code = gl.getError();
    const GL = WebGLRenderingContext;
    if (code === GL.NO_ERROR) {
        return;
    }
    const msgs = {
        [0x0500]: "INVALID_ENUM [+constant not found]",
        [0x0501]: "INVALID_VALUE [+constant not found]",
        [0x0502]: "INVALID_OPERATION [+constant not found]",
        // 0x503 and 0x504 are GL_STACK_OVERFLOW and GL_STACK_UNDERFLOW but not present in webgl.
        [0x0505]: "OUT_OF_MEMORY [+constant not found]",
        [0x0506]: "INVALID_FRAMEBUFFER_OPERATION [+constant not found]",
        [0x9242]: "CONTEXT_LOST_WEBGL [+constant not found]",

        [GL.INVALID_ENUM]: "INVALID_ENUM",
        [GL.INVALID_VALUE]: "INVALID_VALUE",
        [GL.INVALID_OPERATION]: "INVALID_OPERATION",
        [GL.OUT_OF_MEMORY]: "OUT_OF_MEMORY",
        [GL.INVALID_FRAMEBUFFER_OPERATION]: "INVALID_FRAMEBUFFER_OPERATION",
        [GL.CONTEXT_LOST_WEBGL]: "CONTEXT_LOST_WEBGL"
    };
    let d = msgs[code] !== undefined ? msgs[code] : "?";
    throw new Error(`gl.getError() returned 0x${code.toString(16)} (${d}) after ${previousOperationDescription}.`);
}

/**
 * Checks if the given code, returned by gl.checkFramebufferStatus, is an error or not.
 * Throws an error with a descriptive message if the code represents an error.
 * @param {!WebGL2RenderingContext} gl
 */
function checkFrameBufferStatusResult(gl) {
    //noinspection JSUnresolvedFunction,JSUnresolvedVariable
    let code = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    const GL = WebGLRenderingContext;
    //noinspection JSUnresolvedVariable
    if (code === gl.FRAMEBUFFER_COMPLETE) {
        return;
    }
    const msgs = {
        [0]: "Argument wasn't a frame buffer",

        [0x0500]: "INVALID_ENUM [+constant not found]",
        [0x8CD6]: "FRAMEBUFFER_INCOMPLETE_ATTACHMENT [+constant not found]",
        [0x8CD7]: "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT [+constant not found]",
        [0x8CD9]: "FRAMEBUFFER_INCOMPLETE_DIMENSIONS [+constant not found]",
        [0x8CDD]: "FRAMEBUFFER_UNSUPPORTED [+constant not found]",

        [GL.INVALID_ENUM]: "INVALID_ENUM",
        [GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT]: "FRAMEBUFFER_INCOMPLETE_ATTACHMENT",
        [GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT]: "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT",
        [GL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS]: "FRAMEBUFFER_INCOMPLETE_DIMENSIONS",
        [GL.FRAMEBUFFER_UNSUPPORTED]: "FRAMEBUFFER_UNSUPPORTED"
    };
    let d = msgs[code] !== undefined ? msgs[code] : "?";
    throw new Error(`gl.checkFramebufferStatus() returned 0x${code.toString(16)} (${d}).`);
}

class ParametrizedShader {
    constructor(fragmentShaderSource, ...params) {
        this.fragmentShaderSource = fragmentShaderSource;
        this.program = undefined;
        this.params = params;
    }

    withArgs(...args) {
        return new ParametrizedShaderWithArgs(this, args);
    }

    useArgs(...args) {
        if (this.program === undefined) {
            this.program = createFragProgram(this.fragmentShaderSource);
        }

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

//noinspection JSValidateJSDoc
/**
 * @param {!WebGLProgram} program
 * @param {!int} w
 * @param {!int} h
 * @param {!Tex} tex
 */
function drawToTexture(program, tex, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, tex.frameBuffer);
    try {
        checkGetErrorResult(gl, "drawToTexture:bindFrameBuffer");
        checkFrameBufferStatusResult(gl);
        gl.viewport(0, 0, w, h);
        gl.useProgram(program);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        checkGetErrorResult(gl, "drawToTexture:drawArrays");
    } finally {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}

//noinspection JSValidateJSDoc
/**
 * @param {!WebGLTexture} t
 * @param {!int} w
 * @param {!int} h
 * @param {!WebGLFramebuffer} fb
 * @returns {!Uint8Array}
 */
function readTexture(t, w, h, fb) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    try {
        checkGetErrorResult(gl, "readTexture:bindFramebuffer");
        checkFrameBufferStatusResult(gl);
        let outputBuffer = new Uint8Array(w * h);
        //noinspection JSUnresolvedVariable
        gl.readPixels(0, 0, w, h, gl.RED, gl.UNSIGNED_BYTE, outputBuffer);
        checkGetErrorResult(gl, "readTexture:readPixels");
        return outputBuffer;
    } finally {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
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

class TexPair {
    constructor(width, height) {
        this.src = new Tex(width, height);
        this.dst = new Tex(width, height);
    }

    swap() {
        let t = this.src;
        this.src = this.dst;
        this.dst = t;
    }
}

export {
    initGpu,
    createFragProgram,
    drawToTexture,
    readTexture,
    Tex,
    TexPair,
    ParametrizedShader,
    ParametrizedShaderWithArgs,
}
