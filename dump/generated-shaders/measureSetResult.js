////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let measureSetResult = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform int target;
    uniform vec2 state_size;
    uniform sampler2D state;
    uniform vec2 found_ones_size;
    uniform sampler2D found_ones;
    uniform vec2 rand_size;
    uniform sampler2D rand;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int mul_7 = target * 2;
        int add_8 = mul_7 + 1;
        bool ne_9 = y != add_8;
        bool ge_10 = x >= 2;
        bool bit_or_11 = ne_9 || ge_10;
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        bool eq_12 = x == 1;
        int slice_4 = int((texture(found_ones, vec2(0.5, gl_FragCoord.y) / found_ones_size)).x*255.0 + 0.5);
        bool ne_5 = slice_4 != 0;
        int slice_0 = int((texture(rand, vec2(0.5, gl_FragCoord.y) / rand_size)).x*255.0 + 0.5);
        int bitwise_and_1 = slice_0 & 1;
        bool func_bool_2 = bool(bitwise_and_1);
        bool slice_3 = (texture(state, vec2(1.5, gl_FragCoord.y) / state_size)).x > 0.5;
        bool match_6 = 
            ne_5 ? func_bool_2 :
            slice_3;
        bool bit_xor_13 = v_state != match_6;
        bool match_14 = 
            bit_or_11 ? v_state :
            eq_12 ? bit_xor_13 :
            match_6;
        outColor = float(match_14);
    }`,
    ['1i', 'target', false],
    ['tex', 'found_ones', 'found_ones_size'],
    ['tex', 'rand', 'rand_size'],
    ['tex', 'state', 'state_size']);

export {measureSetResult}
