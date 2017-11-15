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
        int right_shift_14 = int((y) >> (1));
        int ne_15 = int((right_shift_14) != (target));
        int v_state = int(texture((state), gl_FragCoord.xy / (state_size)).x * 255.0 + 0.5);
        int eq_16 = int((x) == (0));
        int bitwise_and_17 = int((y) & (1));
        int eq_18 = int((bitwise_and_17) == (0));
        int bitwise_and_19 = int((eq_16) & (eq_18));
        int not_20 = int(~(v_state));
        int bitwise_xor_21 = int((y) ^ (1));
        int slice_22 = int(texture((state), vec2(float(x) + 0.5, float(bitwise_xor_21) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int match_23 = 
            bool(ne_15) ? (v_state) :
            bool(bitwise_and_19) ? (not_20) :
            (slice_22);
        outColor = float(((match_23) & 0xFF)) / 255.0;
    }`,
    ['1i', 'target', false],
    ['tex', 'state', 'state_size']);

export {singleHadamard}
