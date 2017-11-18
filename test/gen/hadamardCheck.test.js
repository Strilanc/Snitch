import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {hadamardCheck} from "src/gen/hadamardCheck.js"

let suite = new GpuSuite("hadamardCheck");

suite.test("example", () => {
    let shader = hadamardCheck.withArgs(2, texture_diagram(
        '       #',
        '      # ',
        '#    #  ',
        '#   #   ',
        '   #    ',
        '  #     ',
        ' #      ',
        '#       '));

    assertShaderOutputs(shader,
        '#     # ',
        '       #',
        '#    #  ',
        '#   #   ',
        '   #    ',
        '  #     ',
        '#       ',
        ' #      ');
});
