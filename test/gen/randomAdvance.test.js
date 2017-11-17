import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, texture_diagram} from "test/GpuTestUtil.js"

import {randomAdvance} from "src/gen/randomAdvance.js"

let suite = new GpuSuite("shifter");

function xorshift32(x) {
    x ^= x << 13;
    x &= 0xFFFFFFFF;
    x ^= x >>> 17;
    x &= 0xFFFFFFFF;
    x ^= x << 5;
    x &= 0xFFFFFFFF;
    return x;
}

/**
 * @param {!int} u
 * @returns {!Array.<!int>}
 */
function bytes(u) {
    return [0, 1, 2, 3].map(i => (u >>> (i*8)) & 0xFF)
}

suite.test("bits", () => {
    let bits = [];
    for (let i = 0; i < 32; i++) {
        bits.push(1 << i);
    }

    let input = texture_diagram(...bits.map(bytes));
    assertShaderOutputs(randomAdvance.withArgs(input), ...bits.map(e => bytes(xorshift32(e))));
});

suite.test("words", () => {
    let input = texture_diagram(
        bytes(0x42483724),
        bytes(0xFFFFFFFF),
        bytes(0x12345678),
        bytes(0));

    assertShaderOutputs(randomAdvance.withArgs(input),
        bytes(xorshift32(0x42483724)),
        bytes(xorshift32(0xFFFFFFFF)),
        bytes(xorshift32(0x12345678)),
        bytes(xorshift32(0)));
});
