////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let shifter = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 offset;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        float prop_x_0 = offset.x;
        int func_int_1 = int(prop_x_0);
        int sub_2 = x - func_int_1;
        bool ge_6 = sub_2 >= 0;
        float prop_y_3 = offset.y;
        int func_int_4 = int(prop_y_3);
        int sub_5 = y - func_int_4;
        bool ge_7 = sub_5 >= 0;
        bool bit_and_8 = ge_6 && ge_7;
        float prop_x_9 = state_size.x;
        int func_int_10 = int(prop_x_9);
        bool lt_11 = sub_2 < func_int_10;
        bool bit_and_12 = bit_and_8 && lt_11;
        float prop_y_13 = state_size.y;
        int func_int_14 = int(prop_y_13);
        bool lt_15 = sub_5 < func_int_14;
        bool bit_and_16 = bit_and_12 && lt_15;
        int slice_17 = int((texture(state, vec2(float(sub_2) + 0.5, float(sub_5) + 0.5) / state_size)).x*255.0 + 0.5);
        int match_18 = 
            bit_and_16 ? slice_17 :
            0;
        outColor = float(match_18) / 255.0;
    }`,
    ['2f', 'offset', true],
    ['tex', 'state', 'state_size']);

export {shifter}
