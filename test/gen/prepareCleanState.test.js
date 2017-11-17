import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {prepareCleanState} from "src/gen/prepareCleanState.js"

let suite = new Suite("prepareCleanState");

suite.test("example", () => {
    assertShaderOutputs(prepareCleanState.withArgs(),
        '  #     ',
        '        ',
        '   #    ',
        '        ',
        '    #   ',
        '        ',
        '     #  ',
        '        ');
});
