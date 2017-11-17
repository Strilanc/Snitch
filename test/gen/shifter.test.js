import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {shifter} from "src/gen/shifter.js"

let suite = new Suite("shifter");

suite.test("example", () => {
    let shader = shifter.withArgs([-2, -1], texture_diagram(
        '       #',
        '      # ',
        '     #  ',
        '1234#ABC',
        '   #    ',
        '  #6  F ',
        ' #  5   ',
        '#    D  '));

    assertShaderOutputs(shader,
        '    #   ',
        '   #    ',
        '34#ABCCC',
        ' #      ',
        '#6  F   ',
        '  5     ',
        '   D    ',
        '   D    ');
});
