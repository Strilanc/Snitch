////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let shifter = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform vec2 offset;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        float prop_x_0 = (offset).x;
        int func_int_1 = int((prop_x_0));
        int sub_2 = (x) - (func_int_1);
        float prop_y_3 = (offset).y;
        int func_int_4 = int((prop_y_3));
        int sub_5 = (y) - (func_int_4);
        int slice_6 = int((texture((state), vec2(float(sub_2) + 0.5, float(sub_5) + 0.5) / (state_size))).x*255.0 + 0.5);
        outColor = float(slice_6) / 255.0;
    }`,
    ['2f', 'offset', true],
    ['tex', 'state', 'state_size']);

export {shifter}
