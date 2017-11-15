////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let singleX = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    uniform int target;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int v_state = int(texture((state), gl_FragCoord.xy / (state_size)).x * 255.0 + 0.5);
        int lt_0 = int((x) < (2));
        int mul_1 = int((target) * (2));
        int add_2 = int((mul_1) + (x));
        int eq_3 = int((y) == (add_2));
        int bitwise_and_4 = int((lt_0) & (eq_3));
        int bitwise_xor_5 = int((v_state) ^ (bitwise_and_4));
        outColor = float(((bitwise_xor_5) & 0xFF)) / 255.0;
    }`,
    ['1i', 'target', false],
    ['tex', 'state', 'state_size']);

export {singleX}
