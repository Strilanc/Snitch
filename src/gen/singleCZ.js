////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let singleCZ = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform int target1;
    uniform int target2;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        bool gt_6 = x > 0;
        int bitwise_and_7 = y & 1;
        bool eq_8 = bitwise_and_7 == 0;
        bool bit_and_9 = gt_6 && eq_8;
        int right_shift_0 = y >> 1;
        bool eq_1 = right_shift_0 == target1;
        bool eq_2 = right_shift_0 == target2;
        bool bit_or_3 = eq_1 || eq_2;
        bool bit_and_10 = bit_and_9 && bit_or_3;
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        int add_4 = target1 + target2;
        int sub_5 = add_4 - right_shift_0;
        int mul_11 = sub_5 * 2;
        int add_12 = mul_11 + 1;
        bool slice_13 = (texture(state, vec2(gl_FragCoord.x, float(add_12) + 0.5) / state_size)).x > 0.5;
        bool ne_14 = v_state != slice_13;
        bool match_15 = 
            bit_and_10 ? ne_14 :
            v_state;
        outColor = float(match_15);
    }`,
    ['1i', 'target1', false],
    ['1i', 'target2', false],
    ['tex', 'state', 'state_size']);

export {singleCZ}
