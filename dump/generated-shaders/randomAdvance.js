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
        uint slice_0 = uint((texture(state, vec2(0.5, gl_FragCoord.y) / state_size)).x*255.0 + 0.5);
        uint slice_1 = uint((texture(state, vec2(1.5, gl_FragCoord.y) / state_size)).x*255.0 + 0.5);
        uint left_shift_4 = slice_1 << 8;
        uint bitwise_or_5 = slice_0 | left_shift_4;
        uint slice_2 = uint((texture(state, vec2(2.5, gl_FragCoord.y) / state_size)).x*255.0 + 0.5);
        uint left_shift_6 = slice_2 << 16;
        uint bitwise_or_7 = bitwise_or_5 | left_shift_6;
        uint slice_3 = uint((texture(state, vec2(3.5, gl_FragCoord.y) / state_size)).x*255.0 + 0.5);
        uint left_shift_8 = slice_3 << 24;
        uint bitwise_or_9 = bitwise_or_7 | left_shift_8;
        uint left_shift_10 = bitwise_or_9 << 13;
        uint bitwise_xor_11 = bitwise_or_9 ^ left_shift_10;
        uint func_uint_12 = uint(4294967295);
        uint bitwise_and_13 = bitwise_xor_11 & func_uint_12;
        uint right_shift_14 = bitwise_and_13 >> 17;
        uint bitwise_xor_15 = bitwise_and_13 ^ right_shift_14;
        uint left_shift_16 = bitwise_xor_15 << 5;
        uint bitwise_xor_17 = bitwise_xor_15 ^ left_shift_16;
        int mul_18 = x * 8;
        uint right_shift_19 = bitwise_xor_17 >> mul_18;
        uint func_uint_20 = uint(255);
        uint bitwise_and_21 = right_shift_19 & func_uint_20;
        outColor = float(bitwise_and_21) / 255.0;
    }`,
    ['tex', 'state', 'state_size']);

export {randomAdvance}
