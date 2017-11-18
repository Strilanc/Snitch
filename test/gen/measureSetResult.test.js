import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {measureSetResult} from "src/gen/measureSetResult.js"

let suite = new GpuSuite("measureSetResult");

suite.test("random-result-toggled", () => {
    let state = texture_diagram(
        '#       ',
        ' #      ',
        '  #     ',
        '   #    ',
        '    #   ',
        '     #  ',
        '      # ',
        '       #');

    let found_ones = texture_diagram(
        ' ',
        ' ',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6');

    let rand = texture_diagram(
        '    ',
        '    ',
        '    ',
        '    ',
        '    ',
        '1   ',
        '    ',
        '    ');

    assertShaderOutputs(measureSetResult.withArgs(2, found_ones, rand, state),
        '#       ',
        ' #      ',
        '  #     ',
        '   #    ',
        '    #   ',
        '##   #  ',
        '      # ',
        '       #');
});

suite.test("random-result-not-toggled", () => {
    let state = texture_diagram(
        '#       ',
        ' #      ',
        '  #     ',
        '   #    ',
        '    #   ',
        '     #  ',
        '      # ',
        '       #');

    let found_ones = texture_diagram(
        ' ',
        ' ',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6');

    let rand = texture_diagram(
        '    ',
        '    ',
        '    ',
        '    ',
        '    ',
        '    ',
        '    ',
        '    ');

    assertShaderOutputs(measureSetResult.withArgs(2, found_ones, rand, state),
        '#       ',
        ' #      ',
        '  #     ',
        '   #    ',
        '    #   ',
        '     #  ',
        '      # ',
        '       #');
});

suite.test("fixed-result", () => {
    let state = texture_diagram(
        '#       ',
        ' #      ',
        '  #     ',
        '   #    ',
        '    #   ',
        '     #  ',
        '      # ',
        '       #');

    let found_ones = texture_diagram(
        ' ',
        ' ',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6');

    let rand = texture_diagram(
        '1   ',
        '    ',
        '    ',
        '    ',
        '    ',
        '1   ',
        '    ',
        '    ');

    assertShaderOutputs(measureSetResult.withArgs(0, found_ones, rand, state),
        '#       ',
        '#       ',
        '  #     ',
        '   #    ',
        '    #   ',
        '     #  ',
        '      # ',
        '       #');
});
