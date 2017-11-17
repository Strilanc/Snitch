import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {findOneFold} from "src/gen/findOneFold.js"

let suite = new Suite("findOneFold");

suite.test("sweep_step1", () => {
    let shader = findOneFold.withArgs(texture_diagram(
        '       1',
        '      1 ',
        '     1  ',
        '    1   ',
        '   1    ',
        '  1     ',
        ' 1      ',
        '1       '));

    assertShaderOutputs(shader,
        '   5',
        '   4',
        '  4 ',
        '  3 ',
        ' 3  ',
        ' 2  ',
        '2   ',
        '1   ');
});

suite.test("sweep_step2", () => {
    let shader = findOneFold.withArgs(texture_diagram(
        '   5',
        '   4',
        '  4 ',
        '  3 ',
        ' 3  ',
        ' 2  ',
        '2   ',
        '1   '));

    assertShaderOutputs(shader,
        ' 778',
        ' 667',
        ' 5  ',
        ' 4  ',
        '4   ',
        '3   ',
        '2   ',
        '1   ');
});

suite.test("sweep_step3", () => {
    let shader = findOneFold.withArgs(texture_diagram(
        ' 7  ',
        '    ',
        ' 5  ',
        ' 4  ',
        '4   ',
        '3   ',
        '2   ',
        '1   '));

    assertShaderOutputs(shader,
        '8   ',
        '    ',
        '6   ',
        '5   ',
        '4   ',
        '3   ',
        '2   ',
        '1   ');
});
