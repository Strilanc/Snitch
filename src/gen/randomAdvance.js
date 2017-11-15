////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let randomAdvance = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int slice_0 = int(texture((state), vec2(float(0) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int slice_1 = int(texture((state), vec2(float(1) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int left_shift_4 = int((slice_1) << (8));
        int bitwise_or_5 = int((slice_0) | (left_shift_4));
        int slice_2 = int(texture((state), vec2(float(2) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int left_shift_6 = int((slice_2) << (16));
        int bitwise_or_7 = int((bitwise_or_5) | (left_shift_6));
        int slice_3 = int(texture((state), vec2(float(3) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int left_shift_8 = int((slice_3) << (24));
        int bitwise_or_9 = int((bitwise_or_7) | (left_shift_8));
        int left_shift_10 = int((bitwise_or_9) << (13));
        int bitwise_xor_11 = int((bitwise_or_9) ^ (left_shift_10));
        int right_shift_12 = int((bitwise_xor_11) >> (17));
        int bitwise_xor_13 = int((bitwise_xor_11) ^ (right_shift_12));
        int left_shift_14 = int((bitwise_xor_13) << (5));
        int bitwise_xor_15 = int((bitwise_xor_13) ^ (left_shift_14));
        int mul_16 = int((x) * (8));
        int right_shift_17 = int((bitwise_xor_15) >> (mul_16));
        outColor = float(((right_shift_17) & 0xFF)) / 255.0;
    }`,
    ['tex', 'state', 'state_size']);

export {randomAdvance}
