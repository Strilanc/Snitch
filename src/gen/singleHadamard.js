////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let singleHadamard = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform int target;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int right_shift_0 = y >> 1;
        bool ne_1 = right_shift_0 != target;
        bool v_state = (texture((state), gl_FragCoord.xy / state_size)).x > 0.5;
        bool eq_2 = x == 0;
        int bitwise_and_3 = y & 1;
        bool eq_4 = bitwise_and_3 == 0;
        bool bit_and_5 = eq_2 && eq_4;
        bool not_6 = !(v_state);
        int bitwise_xor_7 = y ^ 1;
        bool slice_8 = (texture((state), vec2(gl_FragCoord.x, float(bitwise_xor_7) + 0.5) / state_size)).x > 0.5;
        bool match_9 = 
            ne_1 ? v_state :
            bit_and_5 ? not_6 :
            slice_8;
        outColor = float(match_9);
    }`,
    ['1i', 'target', false],
    ['tex', 'state', 'state_size']);

export {singleHadamard}
