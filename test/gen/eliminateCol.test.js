import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {eliminateCol} from "src/gen/eliminateCol.js"

let suite = new GpuSuite("eliminateCol");

suite.test("update", () => {
    let found_ones = texture_diagram(
        '2',
        '3',
        '2',
        '4',
        '1',
        '2'
    );
    let shader = eliminateCol.withArgs(0, found_ones, texture_diagram(
        '#  #####',
        '##  # # ',
        '   #### ',
        '     #  ',
        ' ####   ',
        '    #   '));

    assertShaderOutputs(shader,
        '    #   ',
        '#       ',
        ' # # #  ',
        '     #  ',
        '  ##  # ',
        ' #    # ');
});

suite.test("no-update-false", () => {
    let found_ones = texture_diagram(
        '2',
        '3',
        '2',
        ' ',
        '1',
        '2'
    );
    let shader = eliminateCol.withArgs(1, found_ones, texture_diagram(
        '   #####',
        ' #  # # ',
        '   #### ',
        '        ',
        ' ####   ',
        '    #   '));

    assertShaderOutputs(shader,
        '   #####',
        ' #  # # ',
        '   #### ',
        '        ',
        ' ####   ',
        '    #   ');
});

suite.test("no-update-true", () => {
    let found_ones = texture_diagram(
        '2',
        '3',
        '2',
        ' ',
        '1',
        '2'
    );
    let shader = eliminateCol.withArgs(1, found_ones, texture_diagram(
        '   #####',
        ' #  # # ',
        '   #### ',
        '#       ',
        ' ####   ',
        '    #   '));

    assertShaderOutputs(shader,
        '   #####',
        ' #  # # ',
        '   #### ',
        '#       ',
        ' ####   ',
        '    #   ');
});

suite.test('other-update', () => {
    let fold = texture_diagram(
        '4         ',
        '4         ',
        '3         ',
        '4         ',
        '3         ',
        '1         ',
        '          ',
        '3         ');
    let state = texture_diagram(
        ' #   #  # ',
        '     ###  ',
        '    #  #  ',
        '     ##   ',
        '    # #   ',
        ' #########',
        '          ',
        '    #  #  ');

    assertShaderOutputs(eliminateCol.withArgs(1, fold, state),
        ' #    # # ',
        '       #  ',
        '     #    ',
        '          ',
        '    # #   ',
        ' ####  ###',
        '          ',
        '    #  #  ');
});
