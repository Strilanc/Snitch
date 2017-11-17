////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let measureSetResult = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    uniform vec2 found_ones_size;
    uniform sampler2D found_ones;
    uniform vec2 rand_size;
    uniform sampler2D rand;
    uniform int target;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        int slice_3 = int((texture(found_ones, vec2(float(0) + 0.5, gl_FragCoord.y) / found_ones_size)).x*255.0 + 0.5);
        bool ne_4 = slice_3 != 0;
        int slice_0 = int((texture(rand, vec2(float(0) + 0.5, gl_FragCoord.y) / rand_size)).x*255.0 + 0.5);
        int bitwise_and_1 = slice_0 & 1;
        bool func_bool_2 = bool(bitwise_and_1);
        bool bit_and_5 = ne_4 && func_bool_2;
        int mul_6 = target * 2;
        int add_7 = mul_6 + 1;
        bool eq_8 = y == add_7;
        bool bit_and_9 = bit_and_5 && eq_8;
        bool eq_10 = x == 1;
        bool bit_and_11 = bit_and_9 && eq_10;
        bool ne_12 = v_state != bit_and_11;
        outColor = float(ne_12);
    }`,
    ['1i', 'target', false],
    ['tex', 'found_ones', 'found_ones_size'],
    ['tex', 'rand', 'rand_size'],
    ['tex', 'state', 'state_size']);

export {measureSetResult}
