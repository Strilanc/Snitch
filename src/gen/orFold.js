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
        int slice_0 = int(texture((state), vec2(float((x)*(2) + (-2)) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int slice_1 = int(texture((state), vec2(float((x)*(2) + (-1)) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int bitwise_or_2 = int((slice_0) | (slice_1));
        outColor = float(bitwise_or_2) / 255.0;
    }`,
    ['tex', 'state', 'state_size']);

export {orFold}
