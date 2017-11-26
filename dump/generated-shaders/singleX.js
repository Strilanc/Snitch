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
        bool v_state = (texture((state), gl_FragCoord.xy / state_size)).x > 0.5;
        bool lt_0 = x < 2;
        int mul_1 = target * 2;
        int add_2 = mul_1 + x;
        bool eq_3 = y == add_2;
        bool bit_and_4 = lt_0 && eq_3;
        bool ne_5 = v_state != bit_and_4;
        outColor = float(ne_5);
    }`,
    ['1i', 'target', false],
    ['tex', 'state', 'state_size']);

export {singleX}
