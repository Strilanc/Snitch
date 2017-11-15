////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let findOneFold = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int slice_0 = int(texture((state), vec2(float((x)*(2) + (-2)) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int ne_2 = int((slice_0) != (0));
        int add_3 = int((slice_0) + (x));
        int slice_1 = int(texture((state), vec2(float((x)*(2) + (-1)) + 0.5, float(y) + 0.5) / (state_size)).x * 255.0 + 0.5);
        int ne_4 = int((slice_1) != (0));
        int add_5 = int((slice_1) + (x));
        int add_6 = int((add_5) + (1));
        int match_7 = 
            bool(ne_2) ? (add_3) :
            bool(ne_4) ? (add_6) :
            (0);
        outColor = float(((match_7) & 0xFF)) / 255.0;
    }`,
    ['tex', 'state', 'state_size']);

export {findOneFold}
