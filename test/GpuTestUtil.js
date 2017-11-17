import {assertThat} from "test/TestUtil.js"
import {DetailedError} from "src/base/DetailedError.js"
import {Tex} from 'src/sim/Gpu.js'

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
 * @param {!String} lines
 * @returns {!Tex}
 */
function texture_diagram(...lines) {
    let max_length = 0;
    for (let line of lines) {
        max_length = Math.max(max_length, line.length);
    }
    let result = new Uint8Array(max_length * lines.length);
    for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++) {
            result[i*max_length + j] = char_levels.get(lines[i][j]);
        }
    }
    return new Tex(max_length, lines.length, result);
}

/**
 * @param {!ParametrizedShaderWithArgs} shader
 * @param {!int} w
 * @param {!int} h
 * @returns {!Array.<!string>}
 */
function _reconstruct_texture_diagram(shader, w, h) {
    let vals = shader.read(w, h);
    let lines = [];
    for (let i = 0; i < h; i++) {
        let line = [];
        for (let j = 0; j < w; j++) {
            let k = vals[i*w + j];
            if (!level_chars.has(k)) {
                throw new DetailedError('No char for level.', {k})
            }
            line.push(level_chars.get(k))
        }
        lines.push(line.join(''))
    }
    return lines;
}

/**
 * @param {!ParametrizedShaderWithArgs} shader
 * @param {!String} texture_diagram
 */
function assertShaderOutputs(shader, ...texture_diagram) {
    let h = texture_diagram.length;
    let w = 0;
    for (let line of texture_diagram) {
        w = Math.max(w, line.length);
    }
    let wrap = e => "texture_diagram([\n        '" + e.join("',\n        '") + "'\n    ])";

    let actual = wrap(_reconstruct_texture_diagram(shader, w, h));
    let expected = wrap(texture_diagram);
    assertThat(actual).isEqualTo(expected);
}

export {assertShaderOutputs, texture_diagram}
