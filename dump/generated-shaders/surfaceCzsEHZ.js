////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let surfaceCzsEHZ = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    uniform int surface_width;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        int right_shift_0 = y >> 1;
        int divide_2 = right_shift_0 / surface_width;
        int mul_13 = divide_2 * surface_width;
        int mod_1 = right_shift_0 % surface_width;
        int add_9 = mod_1 + 1;
        int bitwise_xor_10 = add_9 ^ 1;
        int sub_11 = bitwise_xor_10 - 1;
        int add_14 = mul_13 + sub_11;
        int mul_20 = add_14 * 2;
        int add_21 = mul_20 + 1;
        bool slice_22 = (texture(state, vec2(gl_FragCoord.x, float(add_21) + 0.5) / state_size)).x > 0.5;
        bool gt_15 = x > 0;
        int bitwise_and_16 = y & 1;
        bool eq_17 = bitwise_and_16 == 0;
        bool bit_and_18 = gt_15 && eq_17;
        int add_5 = mod_1 + 1;
        int bitwise_or_6 = add_5 | 1;
        int sub_7 = bitwise_or_6 - 1;
        bool lt_8 = sub_7 < surface_width;
        int bitwise_and_3 = divide_2 & 1;
        bool eq_4 = bitwise_and_3 == 0;
        bool bit_and_12 = lt_8 && eq_4;
        bool bit_and_19 = bit_and_18 && bit_and_12;
        bool bit_and_23 = slice_22 && bit_and_19;
        bool bit_xor_24 = v_state != bit_and_23;
        outColor = float(bit_xor_24);
    }`,
    ['1i', 'surface_width', false],
    ['tex', 'state', 'state_size']);

export {surfaceCzsEHZ}
