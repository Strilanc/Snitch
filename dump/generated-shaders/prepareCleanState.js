import {ParametrizedShader} from 'src/sim/Gpu.js'

let prepareCleanState = new ParametrizedShader(`#version 300 es
    precision highp float;
    precision highp int;
    
    out float outColor;
    void main() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        int mul_0 = x * 2;
        int add_1 = y + 4;
        bool eq_2 = mul_0 == add_1;
        outColor = float(eq_2);
    }`);

export {prepareCleanState}
