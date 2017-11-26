////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let hadamardAll = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        bool eq_8 = x == 0;
        int bitwise_and_9 = y & 1;
        bool eq_10 = bitwise_and_9 == 0;
        bool bit_and_11 = eq_8 && eq_10;
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        bool not_12 = !v_state;
        int bitwise_xor_13 = y ^ 1;
        bool slice_14 = (texture(state, vec2(gl_FragCoord.x, float(bitwise_xor_13) + 0.5) / state_size)).x > 0.5;
        bool match_15 = 
            bit_and_11 ? not_12 :
            slice_14;
        outColor = float(match_15);
    }`,
    ['tex', 'state', 'state_size']);

export {hadamardAll}