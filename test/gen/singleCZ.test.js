import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {singleCZ} from "src/gen/singleCZ.js"

let suite = new Suite("singleCZ");

suite.test("example", () => {
    let shader = singleCZ.withArgs(1, 2, texture_diagram(
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
        '  #  #  ',
        '    #   ',
        '   ##   ',
        '  #     ',
        ' #      ',
        '#       ');
});

suite.test("flag", () => {
    let shader = singleCZ.withArgs(3, 2, texture_diagram(
        '       #',
        '      # ',
        '     #  ',
        '    #   ',
        '   # # #',
        '  #   # ',
        ' #      ',
        '#   ##  '));

    assertShaderOutputs(shader,
        '       #',
        '      # ',
        '     #  ',
        '    #   ',
        '   ##  #',
        '  #   # ',
        ' ##   # ',
        '#   ##  ');
});
