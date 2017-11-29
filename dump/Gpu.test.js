import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {ParametrizedShader} from 'src/sim/Gpu.js'

let suite = new GpuSuite('gpu');

suite.test('texture', () => {
    assertThat(texture_diagram('5').read()).isEqualTo(new Uint8Array([5]));
    assertThat(texture_diagram('7').read()).isEqualTo(new Uint8Array([7]));
    assertThat(texture_diagram('1234').read()).isEqualTo(new Uint8Array([1, 2, 3, 4]));
    assertThat(texture_diagram('1', '2', '3', '4').read()).isEqualTo(new Uint8Array([1, 2, 3, 4]));
    assertThat(texture_diagram('12345').read()).isEqualTo(new Uint8Array([1, 2, 3, 4, 5]));
    assertThat(texture_diagram('1', '2', '3', '4', '5').read()).isEqualTo(new Uint8Array([1, 2, 3, 4, 5]));

    assertThat(texture_diagram(
        '123',
        '456',
        '789').read()).isEqualTo(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));

    assertThat(texture_diagram(
        '12345',
        '6789A',
        'BCDEF',
        ' 4321',
        '#9876'
    ).read()).isEqualTo(new Uint8Array([
        1, 2, 3, 4, 5,
        6, 7, 8, 9, 10,
        11, 12, 13, 14, 15,
        0, 4, 3, 2, 1,
        255, 9, 8, 7, 6
    ]));
});

suite.test('shader', () => {
    let shader = new ParametrizedShader(`#version 300 es
        precision highp float;
        precision highp int;
        uniform vec2 state_size;
        uniform sampler2D state;
        out float outColor;
        void main() {
            int v = int(texture(state, gl_FragCoord.xy / state_size).x * 255.0 + 0.5);
            v ^= 1;
            outColor = float(v) / 255.0;
        }`,
        ['tex', 'state', 'state_size']);

    assertShaderOutputs(shader.withArgs(texture_diagram('3')), '2');

    assertShaderOutputs(shader.withArgs(texture_diagram(
        '12345',
        '6789A',
        'BCDEF',
        ' 4321',
        'A9876'
    )),
        ' 3254',
        '7698B',
        'ADCFE',
        '1523 ',
        'B8967'
    );
});
