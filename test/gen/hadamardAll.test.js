import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {hadamardAll} from "src/gen/hadamardAll.js"

let suite = new GpuSuite("hadamardAll");

suite.test("example", () => {
    let shader = hadamardAll.withArgs(texture_diagram(
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
        '    #   ',
        '#    #  ',
        '# #     ',
        '   #    ',
        '#       ',
        ' #      ');
});
