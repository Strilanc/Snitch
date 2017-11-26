////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let bitToInt = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    uniform vec2 state_size;
    uniform sampler2D state;
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        bool v_state = (texture(state, gl_FragCoord.xy / state_size)).x > 0.5;
        bool func_bool_0 = bool(v_state);
        int func_int_1 = int(func_bool_0);
        outColor = float(func_int_1) / 255.0;
    }`,
    ['tex', 'state', 'state_size']);

export {bitToInt}
