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
        int slice_0 = int((texture((state), vec2(float((x)*(2)) + 0.5, gl_FragCoord.y) / (state_size))).x*255.0 + 0.5);
        bool ne_2 = (slice_0) != (0);
        int add_3 = (slice_0) + (x);
        int slice_1 = int((texture((state), vec2(float((x)*(2) + (1)) + 0.5, gl_FragCoord.y) / (state_size))).x*255.0 + 0.5);
        bool ne_4 = (slice_1) != (0);
        int add_5 = (slice_1) + (x);
        int add_6 = (add_5) + (1);
        int match_7 = 
            (ne_2) ? (add_3) :
            (ne_4) ? (add_6) :
            (0);
        outColor = float(match_7) / 255.0;
    }`,
    ['tex', 'state', 'state_size']);

export {findOneFold}
