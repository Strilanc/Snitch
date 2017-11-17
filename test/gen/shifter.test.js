import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {shifter} from "src/gen/shifter.js"

let suite = new GpuSuite("shifter");

suite.test("example", () => {
    let input = texture_diagram(
        '       #',
        '      # ',
        '     #  ',
        '1234#ABC',
        '   #    ',
        '  #6  F ',
        ' #  5   ',
        '#    D  ');

    assertShaderOutputs(shifter.withArgs([-2, -1], input),
        '    #   ',
        '   #    ',
        '34#ABC  ',
        ' #      ',
        '#6  F   ',
        '  5     ',
        '   D    ',
        '        ');

    assertShaderOutputs(shifter.withArgs([2, 1], input),
        '        ',
        '        ',
        '        ',
        '       #',
        '  1234#A',
        '     #  ',
        '    #6  ',
        '   #  5 ');
});
