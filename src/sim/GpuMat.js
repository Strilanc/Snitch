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

import {allocTexture, drawToTexture, createFragProgram} from "src/sim/Gpu.js";

class GpuBinaryMat {
    constructor(width, height, texture=undefined) {
        if (texture === undefined) {
            texture = allocTexture(width, height);
        }
        this.width = width;
        this.height = height;
        this.qubit_width = 0;
        this.qubit_height = 0;
        this.measure_add = 0;
        this.texture = texture;
    }
}

function qubit_pos_to_row_index(x, y) {

}

let prepareCleanStateShader = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    void main() {
        outColor = float(gl_FragCoord.y % 2.0 == 0.0 && gl_FragCoord.x - 2.0 == gl_FragCoord.y / 2.0);
    }`);

let applyXOperation = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D input;
    uniform float target;
    void main() {
        vec2 xy = gl_FragCoord.xy / size;
        float prev = texture(input, xy);
        float update = float(gl_FragCoord == vec2(0.0, target * 2.0) || gl_FragCoord == vec2(1.0, target * 2.0 + 1.0));
        outColor = float((prev < 0.5) != (update < 0.5));
    }`);

let applyCzOperation = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D input;
    uniform float target1;
    uniform float target2;
    void main() {
        vec2 xy = gl_FragCoord.xy / size;
        float prev = texture(input, xy);
        float alt = (target1 + target2 - xy.y) * 2.0 + 1.0;
        float other = texture(input, vec2(xy.x, alt / size.y));
        float mask = float(gl_FragCoord.y == target1 * 2.0 || gl_FragCoord.y == target2 * 2.0);
        float update = other * mask;
        outColor = float((prev < 0.5) != (update < 0.5));
    }`);

let applyXors = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D input;
    uniform sampler2D partner_mask;
    void main() {
        vec2 xy = gl_FragCoord.xy / size;
        vec2 loc = texture(partner_mask, xy);
        float x1 = texture(input, xy);
        float x2 = loc.x == -1.0 ? 0.0 : texture(input, loc / size);
        outColor = float((x1 > 0.5) != (x2 > 0.5));
    }`);

let apply_row_xors = createFragProgram(`#version 300 es
    precision highp float;
    precision highp int;
    out float outColor;
    uniform vec2 size;
    uniform sampler2D input;
    uniform sampler2D partner_mask;
    void main() {
        vec2 xy = gl_FragCoord.xy / size;
        vec2 loc = texture(partner_mask, xy);
        float x1 = texture(input, xy);
        float x2 = loc.x == -1.0 ? 0.0 : texture(input, loc / size);
        outColor = float((x1 > 0.5) != (x2 > 0.5));
    }`);

export {GpuBinaryMat}
