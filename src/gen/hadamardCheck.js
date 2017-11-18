////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let hadamardCheck = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform int surface_width;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int right_shift_0 = y >> 1;
        int mod_1 = right_shift_0 % surface_width;
        int bitwise_and_6 = mod_1 & 1;
        int divide_2 = right_shift_0 / surface_width;
        int bitwise_and_7 = divide_2 & 1;
        bool ne_8 = bitwise_and_6 != bitwise_and_7;
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        bool eq_9 = x == 0;
        int bitwise_and_10 = y & 1;
        bool eq_11 = bitwise_and_10 == 0;
        bool bit_and_12 = eq_9 && eq_11;
        bool not_13 = !v_state;
        int bitwise_xor_14 = y ^ 1;
        bool slice_15 = (texture(state, vec2(gl_FragCoord.x, float(bitwise_xor_14) + 0.5) / state_size)).x > 0.5;
        bool match_16 = 
            ne_8 ? v_state :
            bit_and_12 ? not_13 :
            slice_15;
        outColor = float(match_16);
    }`,
    ['1i', 'surface_width', false],
    ['tex', 'state', 'state_size']);

export {hadamardCheck}