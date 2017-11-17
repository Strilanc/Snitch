import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {singleX} from "src/gen/singleX.js"

let suite = new Suite("singleX");

suite.test("example", () => {
    let shader = singleX.withArgs(1, texture_diagram(
        '       #',
        '      # ',
        '     #  ',
        '    #   ',
        '   #    ',
        '  #     ',
        ' #      ',
        '#       '));

    assertShaderOutputs(shader,
        '       #',
        '      # ',
        '#    #  ',
        ' #  #   ',
        '   #    ',
        '  #     ',
        ' #      ',
        '#       ');
});
