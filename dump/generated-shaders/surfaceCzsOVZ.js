////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let surfaceCzsOVZ = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    uniform int surface_width;
    uniform int surface_height;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        int right_shift_0 = y >> 1;
        int divide_2 = right_shift_0 / surface_width;
        int bitwise_xor_7 = divide_2 ^ 1;
        int mul_9 = bitwise_xor_7 * surface_width;
        int mod_1 = right_shift_0 % surface_width;
        int add_10 = mul_9 + mod_1;
        int mul_16 = add_10 * 2;
        int add_17 = mul_16 + 1;
        bool slice_18 = (texture(state, vec2(gl_FragCoord.x, float(add_17) + 0.5) / state_size)).x > 0.5;
        bool gt_11 = x > 0;
        int bitwise_and_12 = y & 1;
        bool eq_13 = bitwise_and_12 == 0;
        bool bit_and_14 = gt_11 && eq_13;
        int bitwise_or_5 = divide_2 | 1;
        bool lt_6 = bitwise_or_5 < surface_height;
        int bitwise_and_3 = mod_1 & 1;
        bool eq_4 = bitwise_and_3 == 1;
        bool bit_and_8 = lt_6 && eq_4;
        bool bit_and_15 = bit_and_14 && bit_and_8;
        bool bit_and_19 = slice_18 && bit_and_15;
        bool bit_xor_20 = v_state != bit_and_19;
        outColor = float(bit_xor_20);
    }`,
    ['1i', 'surface_height', false],
    ['1i', 'surface_width', false],
    ['tex', 'state', 'state_size']);

export {surfaceCzsOVZ}
