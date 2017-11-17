import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {orFold} from "src/gen/orFold.js"

let suite = new Suite("orFold");

suite.test("sweep", () => {
    let shader = orFold.withArgs(texture_diagram(
        '       #',
        '      # ',
        '     #  ',
        '    #   ',
        '   #    ',
        '  #     ',
        ' #      ',
        '#       '));

    assertShaderOutputs(shader,
        '   #',
        '   #',
        '  # ',
        '  # ',
        ' #  ',
        ' #  ',
        '#   ',
        '#   ');
});

suite.test("sweep_step2", () => {
    let shader = orFold.withArgs(texture_diagram(
        '   #',
        '   #',
        '  # ',
        '  # ',
        ' #  ',
        ' #  ',
        '#   ',
        '    '));

    assertShaderOutputs(shader,
        ' #',
        ' #',
        ' #',
        ' #',
        '# ',
        '# ',
        '# ',
        '  ');
});

suite.test("sweep_step3", () => {
    let shader = orFold.withArgs(texture_diagram(
        ' #',
        ' #',
        ' #',
        ' #',
        '# ',
        '# ',
        '# ',
        '# '));

    assertShaderOutputs(shader,
        '#',
        '#',
        '#',
        '#',
        '#',
        '#',
        '#',
        '#');
});
