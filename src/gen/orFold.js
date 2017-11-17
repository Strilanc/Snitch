////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let orFold = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        bool slice_0 = (texture((state), vec2(float((x)*(2)) + 0.5, gl_FragCoord.y) / (state_size))).x > 0.5;
        bool slice_1 = (texture((state), vec2(float((x)*(2) + (1)) + 0.5, gl_FragCoord.y) / (state_size))).x > 0.5;
        bool bit_or_2 = (slice_0) || (slice_1);
        outColor = float(bit_or_2);
    }`,
    ['tex', 'state', 'state_size']);

export {orFold}
