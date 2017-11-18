import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {hadamardData} from "src/gen/hadamardData.js"

let suite = new GpuSuite("hadamardData");

suite.test("example", () => {
    let shader = hadamardData.withArgs(2, texture_diagram(
        '       #',
        '      # ',
        '#    #  ',
        '#   #   ',
        '   #    ',
        '  #     ',
        ' #      ',
        '#       '));

    assertShaderOutputs(shader,
        '       #',
        '      # ',
        '    #   ',
        '#    #  ',
        '# #     ',
        '   #    ',
        ' #      ',
        '#       ');
});
