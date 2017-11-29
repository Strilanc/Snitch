import {assertThat, assertTrue, Suite} from "test/TestUtil.js"
import {DetailedError} from "src/base/DetailedError.js"
import {initGpu, Tex, TexPair} from 'src/sim/Gpu.js'

let char_levels = new Map([
    [' ', 0],
    ['1', 1],
    ['2', 2],
    ['3', 3],
    ['4', 4],
    ['5', 5],
    ['6', 6],
    ['7', 7],
    ['8', 8],
    ['9', 9],
    ['A', 10],
    ['B', 11],
    ['C', 12],
    ['D', 13],
    ['E', 14],
    ['F', 15],
    ['#', 255],
]);
let level_chars = new Map([...char_levels.entries()].map(e => [e[1], e[0]]));

/**
 * @param {!String|!Array.<!int>} lines
 * @returns {!TexPair}
 */
function texture_diagram(...lines) {
    let max_length = 0;
    for (let line of lines) {
        max_length = Math.max(max_length, line.length);
    }
    let buf = new Uint8Array(max_length * lines.length);
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let j = 0; j < line.length; j++) {
            buf[i*max_length + j] = Number.isInteger(line[j]) ? line[j] : char_levels.get(line[j]);
        }
    }
    return new TexPair(max_length, lines.length, buf);
}

/**
 * @param {!Uint8Array} buf
 * @param {!int} w
 * @param {!int} h
 * @param {!Array.<!string|!Array.<!int>>} matchingDiagram
 * @returns {!Array.<!string>}
 */
function _reconstruct_texture_diagram(buf, w, h, matchingDiagram) {
    let lines = [];
    assertThat(matchingDiagram.length).isEqualTo(h);
    for (let i = 0; i < h; i++) {
        let line = [];
        let useRaw = matchingDiagram.length <= i || Number.isInteger(matchingDiagram[i][0]);
        for (let j = 0; j < w; j++) {
            let k = buf[i*w + j];
            if (useRaw) {
                line.push(k);
            } else {
                if (!level_chars.has(k)) {
                    throw new DetailedError('No char for level.', {level: k})
                }
                line.push(level_chars.get(k))
            }
        }
        lines.push(useRaw ? line.join(',') : line.join(''))
    }
    return lines;
}

/**
 * @param {!Tex|!TexPair} texture
 * @param {!String|!Array.<!int>} texture_diagram
 */
function assertTextureReads(texture, ...texture_diagram) {
    let wrap = e => "texture_diagram(\n        '" + e.join("',\n        '") + "'\n    )";
    let actual = wrap(_reconstruct_texture_diagram(texture.read(), texture.width, texture.height, texture_diagram));
    let expected = wrap(texture_diagram);
    assertThat(actual).isEqualTo(expected);
}

/**
 * @param {!ParametrizedShaderWithArgs} shader
 * @param {!String|!Array.<!int>} texture_diagram
 */
function assertShaderOutputs(shader, ...texture_diagram) {
    let h = texture_diagram.length;
    let w = 0;
    for (let line of texture_diagram) {
        w = Math.max(w, line.length);
    }
    let wrap = e => "texture_diagram([\n        '" + e.join("',\n        '") + "'\n    ])";

    let actual = wrap(_reconstruct_texture_diagram(shader.read(w, h), w, h, texture_diagram));
    let expected = wrap(texture_diagram);
    assertThat(actual).isEqualTo(expected);
}

export class GpuSuite extends Suite {
    /**
     * @param {!string} name
     */
    constructor(name) {
        super(name);

        try {
            initGpu(document.createElement('canvas'));
            this.gpu_error = undefined;
        } catch (ex) {
            this.gpu_error = ex;
            console.warn(`Skipping '${name}' tests because WebGL2 support isn't present.`);
            super.test('fake', () => {assertTrue(true);});
        }
    }

    /**
     * @param {!string} name
     * @param {!function(!{ warn_only: !boolean|!string })} method
     * @param {!boolean=false} later
     */
    test(name, method, later=false) {
        if (this.gpu_error === undefined) {
            super.test(name, method, later);
        }
    }
}

export {GpuSuite, assertShaderOutputs, texture_diagram, assertTextureReads}
