import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {bitToInt} from "src/gen/bitToInt.js"

let suite = new GpuSuite("shifter");

suite.test("example", () => {
    let input = texture_diagram(
        ' #  ',
        '  # ',
        '1   ',
        '   2');

    assertShaderOutputs(bitToInt.withArgs(input),
        ' 1  ',
        '  1 ',
        '    ',
        '    ');
});
