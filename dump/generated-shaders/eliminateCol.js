////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let eliminateCol = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform int target;
    uniform vec2 found_ones_size;
    uniform sampler2D found_ones;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int mul_11 = target * 2;
        bool eq_12 = y == mul_11;
        int mul_0 = target * 2;
        int add_1 = mul_0 + 1;
        int slice_2 = int((texture(found_ones, vec2(0.5, float(add_1) + 0.5) / found_ones_size)).x*255.0 + 0.5);
        int add_3 = slice_2 + 1;
        bool ge_4 = add_3 >= 2;
        bool bit_and_13 = eq_12 && ge_4;
        bool eq_14 = x == add_3;
        bool slice_5 = (texture(state, vec2(gl_FragCoord.x, float(add_1) + 0.5) / state_size)).x > 0.5;
        bool slice_6 = (texture(state, vec2(float(add_3) + 0.5, gl_FragCoord.y) / state_size)).x > 0.5;
        bool bit_and_7 = slice_5 && slice_6;
        bool bit_and_8 = bit_and_7 && ge_4;
        bool gt_9 = x > 0;
        bool bit_and_10 = bit_and_8 && gt_9;
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        bool bit_xor_15 = bit_and_10 != v_state;
        bool match_16 = 
            bit_and_13 ? eq_14 :
            bit_xor_15;
        outColor = float(match_16);
    }`,
    ['1i', 'target', false],
    ['tex', 'found_ones', 'found_ones_size'],
    ['tex', 'state', 'state_size']);

export {eliminateCol}
