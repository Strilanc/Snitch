import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {singleHadamard} from "src/gen/singleHadamard.js"

let suite = new Suite("singleHadamard");

suite.test("example", () => {
    let shader = singleHadamard.withArgs(2, texture_diagram(
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
        '     #  ',
        '    #   ',
        '# #     ',
        '   #    ',
        ' #      ',
        '#       ');
});

suite.test("flag", () => {
    let shader = singleHadamard.withArgs(1, texture_diagram(
        '   #',
        '  # ',
        '    ',
        ' # #'));

    assertShaderOutputs(shader,
        '   #',
        '  # ',
        '## #',
        '    ');

    let shader2 = singleHadamard.withArgs(1, texture_diagram(
        '   #',
        '  # ',
        '#   ',
        ' # #'));

    assertShaderOutputs(shader2,
        '   #',
        '  # ',
        ' # #',
        '#   ');
});
