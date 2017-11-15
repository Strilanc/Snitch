////// AUTO-GENERATED CODE //////

import {ParametrizedShader} from 'src/sim/Gpu.js'

let prepareCleanState = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int mul_0 = int((x) * (2));
        int add_1 = int((y) + (4));
        int eq_2 = int((mul_0) == (add_1));
        int eq_3 = int((x) == (0));
        int bitwise_and_4 = int((y) & (1));
        int eq_5 = int((bitwise_and_4) == (1));
        int bitwise_and_6 = int((eq_3) & (eq_5));
        int match_7 = 
            bool(eq_2) ? (255) :
            bool(bitwise_and_6) ? (127) :
            (0);
        outColor = float(((match_7) & 0xFF)) / 255.0;
    }`);

export {prepareCleanState}
