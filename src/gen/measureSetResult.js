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
        int v_state = int(texture((state), gl_FragCoord.xy / (state_size)).x * 255.0 + 0.5);
        int slice_2 = int(texture((found_ones), vec2(float(2) + 0.5, float(y) + 0.5) / (found_ones_size)).x * 255.0 + 0.5);
        int ne_3 = int((slice_2) != (0));
        int slice_0 = int(texture((rand), vec2(float(0) + 0.5, float(y) + 0.5) / (rand_size)).x * 255.0 + 0.5);
        int bitwise_and_1 = int((slice_0) & (1));
        int bitwise_and_4 = int((ne_3) & (bitwise_and_1));
        int mul_5 = int((target) * (2));
        int add_6 = int((mul_5) + (1));
        int eq_7 = int((y) == (add_6));
        int bitwise_and_8 = int((bitwise_and_4) & (eq_7));
        int eq_9 = int((x) == (1));
        int bitwise_and_10 = int((bitwise_and_8) & (eq_9));
        int bitwise_and_11 = int((bitwise_and_10) & (1));
        int mul_12 = int((bitwise_and_11) * (255));
        int bitwise_xor_13 = int((v_state) ^ (mul_12));
        outColor = float(((bitwise_xor_13) & 0xFF)) / 255.0;
    }`,
    ['1i', 'target', false],
    ['tex', 'found_ones', 'found_ones_size'],
    ['tex', 'rand', 'rand_size'],
    ['tex', 'state', 'state_size']);

export {measureSetResult}
