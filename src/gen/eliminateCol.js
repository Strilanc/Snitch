////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let eliminateCol = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform int target;
    uniform sampler2D state;
    uniform vec2 found_ones_size;
    uniform sampler2D found_ones;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int mul_0 = int((target) * (2));
        int add_1 = int((mul_0) + (1));
        int slice_4 = int(texture((state), vec2(float(x) + 0.5, float(add_1) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int slice_2 = int(texture((found_ones), vec2(float(2) + 0.5, float(add_1) + 0.5) / (found_ones_size)).x * 255.0 + 0.5);
        int add_3 = int((slice_2) + (1));
        int slice_5 = int(texture((state), vec2(float(add_3) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int bitwise_and_6 = int((slice_4) & (slice_5));
        int ge_7 = int((add_3) >= (2));
        int bitwise_and_8 = int((bitwise_and_6) & (ge_7));
        int v_state = int(texture((state), gl_FragCoord.xy / (state_size)).x * 255.0 + 0.5);
        int bitwise_xor_9 = int((bitwise_and_8) ^ (v_state));
        outColor = float(((bitwise_xor_9) & 0xFF)) / 255.0;
    }`,
    ['1i', 'target', false],
    ['tex', 'found_ones', 'found_ones_size'],
    ['tex', 'state', 'state_size']);

export {eliminateCol}
