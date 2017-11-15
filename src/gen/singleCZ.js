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
        int gt_6 = int((x) > (0));
        int bitwise_and_7 = int((y) & (1));
        int eq_8 = int((bitwise_and_7) == (0));
        int bitwise_and_9 = int((gt_6) & (eq_8));
        int right_shift_0 = int((y) >> (1));
        int eq_1 = int((right_shift_0) == (target1));
        int eq_2 = int((right_shift_0) == (target2));
        int bitwise_or_3 = int((eq_1) | (eq_2));
        int bitwise_and_10 = int((bitwise_and_9) & (bitwise_or_3));
        int v_state = int(texture((state), gl_FragCoord.xy / (state_size)).x * 255.0 + 0.5);
        int add_4 = int((target1) + (target2));
        int sub_5 = int((add_4) - (right_shift_0));
        int mul_11 = int((sub_5) * (2));
        int add_12 = int((mul_11) + (1));
        int slice_13 = int(texture((state), vec2(float(x) + 0.5, float(add_12) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int bitwise_xor_14 = int((v_state) ^ (slice_13));
        int match_15 = 
            bool(bitwise_and_10) ? (bitwise_xor_14) :
            (v_state);
        outColor = float(((match_15) & 0xFF)) / 255.0;
    }`,
    ['1i', 'target1', false],
    ['1i', 'target2', false],
    ['tex', 'state', 'state_size']);

export {singleCZ}
