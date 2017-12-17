// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from 'test/TestUtil.js'
import {BorderLoc, SurfaceCodeLayout} from 'src/sim/SurfaceCodeLayout.js'
import {X_AXIS, Z_AXIS} from "src/sim/Util.js";

let suite = new Suite('StabilizerQubit');

function _inferConstraintFromChar(c, row, col, firstColIsX, firstRowIsX, cellAtOriginIsData) {
    if (c === 'x' || c === '+') {
        firstColIsX.add((col & 1) === 0);
        firstRowIsX.add((row & 1) === 0);
        cellAtOriginIsData.add((col & 1) !== (row & 1));
    } else if (c === 'z' || c === '.' || c === '·') {
        firstColIsX.add((col & 1) === 1);
        firstRowIsX.add((row & 1) === 1);
        cellAtOriginIsData.add((col & 1) !== (row & 1));
    } else if (c === '|') {
        firstColIsX.add((col & 1) === 0);
        firstRowIsX.add((row & 1) === 1);
        cellAtOriginIsData.add((col & 1) === (row & 1));
    } else if (c === '-') {
        firstColIsX.add((col & 1) === 1);
        firstRowIsX.add((row & 1) === 0);
        cellAtOriginIsData.add((col & 1) === (row & 1));
    } else if (c === '_') {
        cellAtOriginIsData.add((col & 1) === (row & 1));
    }
}

/**
 * @param {!Array.<!String>} lines
 * @private
 */
function _inferLayoutParityOfDiagram(lines) {
    let firstRowIsX = new Set();
    let firstColIsX = new Set();
    let cellAtOriginIsData = new Set();
    for (let row = 0; row < lines.length; row++) {
        for (let col = 0; col < lines[row].length; col++) {
            let c = lines[row][col];
            _inferConstraintFromChar(c, row, col, firstColIsX, firstRowIsX, cellAtOriginIsData);
        }
    }

    if (firstRowIsX.size >  1 || firstColIsX.size > 1 || cellAtOriginIsData.size > 1) {
        throw new Error('Inconsistent X/Z/data positions in diagram:\n<<<<\n    ' + lines.join('\n    ') + '\n>>>>')
    }

    if (cellAtOriginIsData.size === 0) {
        return {firstRowIsX: false, firstColIsX: false};
    }

    if (firstRowIsX.size === 0) {
        return {firstRowIsX: false, firstColIsX: [...cellAtOriginIsData][0]};
    }

    return {firstRowIsX: [...firstRowIsX][0], firstColIsX: [...firstColIsX][0]};
}

function parseLayoutDiagram(diagram) {
    let lines = diagram.split('\n').map(e => e.trim().toLowerCase()).filter(e => e !== '');

    let {firstRowIsX, firstColIsX} = _inferLayoutParityOfDiagram(lines);
    let layout = new SurfaceCodeLayout(
        Math.max(...lines.map(e => e.length)),
        lines.length,
        firstRowIsX,
        firstColIsX);

    for (let row = 0; row < lines.length; row++) {
        for (let col = 0; col < lines[row].length; col++) {
            let c = lines[row][col];
            if (c === 'h' || c === '@') {
                layout.holes[col][row] = true;
            }
        }
    }

    return layout;
}

suite.test('parseLayoutDiagram-failures', () => {
    assertThrows(() => parseLayoutDiagram(`
        x_
        _x
    `));
    assertThrows(() => parseLayoutDiagram(`
        ?_
        ?_
    `));
    assertThrows(() => parseLayoutDiagram(`
        x?
        z?
    `));
    assertThrows(() => parseLayoutDiagram(`
        x?
        ?_
    `));
});

suite.test('parseLayoutDiagram-size', () => {
    let r = parseLayoutDiagram(`
        x_
        _z
    `);
    assertThat(r.width === 2);
    assertThat(r.height === 2);

    r = parseLayoutDiagram(`
        ?????
    `);
    assertThat(r.width === 5);
    assertThat(r.height === 1);

    r = parseLayoutDiagram(`
        x_x_x
        _?
        x_x_x
    `);
    assertThat(r.width === 5);
    assertThat(r.height === 3);
});

suite.test('parseLayoutDiagram-parity', () => {
    let r = parseLayoutDiagram(`
        x_
        _z
    `);
    assertTrue(r.firstColIsX);
    assertTrue(r.firstRowIsX);

    r = parseLayoutDiagram(`
        x?
        ??
    `);
    assertTrue(r.firstColIsX);
    assertTrue(r.firstRowIsX);

    r = parseLayoutDiagram(`
        X?
        ??
    `);
    assertTrue(r.firstColIsX);
    assertTrue(r.firstRowIsX);

    r = parseLayoutDiagram(`
        z_
        _x
    `);
    assertFalse(r.firstColIsX);
    assertFalse(r.firstRowIsX);

    r = parseLayoutDiagram(`
        _z
        x_
    `);
    assertTrue(r.firstColIsX);
    assertFalse(r.firstRowIsX);

    r = parseLayoutDiagram(`
        _x
        z_
    `);
    assertFalse(r.firstColIsX);
    assertTrue(r.firstRowIsX);

    r = parseLayoutDiagram(`
        _?
        ?_
    `);
    assertTrue(r.firstColIsX);
    assertFalse(r.firstRowIsX);

    r = parseLayoutDiagram(`
        ?_
        _?
    `);
    assertFalse(r.firstColIsX);
    assertFalse(r.firstRowIsX);

    r = parseLayoutDiagram(`
        ??
        ??
    `);
    assertFalse(r.firstColIsX);
    assertFalse(r.firstRowIsX);
});

suite.test('construct', () => {
    let s = new SurfaceCodeLayout(2, 3);
    assertThat(s.width).isEqualTo(2);
    assertThat(s.height).isEqualTo(3);
    assertThat(s.holes).isEqualTo([[false, false, false], [false, false, false]]);
    assertFalse(s.firstRowIsX);
    assertFalse(s.firstColIsX);
    assertThat(s.points).isEqualTo([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]);
});

suite.test('data-vs-check-types', () => {
    let s = new SurfaceCodeLayout(2, 2);

    assertFalse(s.isDataQubit(0, 0));
    assertTrue(s.isCheckQubit(0, 0));
    assertTrue(s.isCheckQubit(0, 0, Z_AXIS));
    assertFalse(s.isCheckQubit(0, 0, X_AXIS));

    assertTrue(s.isDataQubit(0, 1));
    assertFalse(s.isCheckQubit(0, 1));
    assertFalse(s.isCheckQubit(0, 1, Z_AXIS));
    assertFalse(s.isCheckQubit(0, 1, X_AXIS));

    assertTrue(s.isDataQubit(1, 0));
    assertFalse(s.isCheckQubit(1, 0));
    assertFalse(s.isCheckQubit(1, 0, Z_AXIS));
    assertFalse(s.isCheckQubit(1, 0, X_AXIS));

    assertFalse(s.isDataQubit(1, 1));
    assertTrue(s.isCheckQubit(1, 1));
    assertFalse(s.isCheckQubit(1, 1, Z_AXIS));
    assertTrue(s.isCheckQubit(1, 1, X_AXIS));
});

suite.test('nearestDataCoord', () => {
    let s = new SurfaceCodeLayout(4, 4);

    // Directly on the center.
    assertThat(s.nearestDataCoord(0.5, 1.5)).isEqualTo([0, 1]);
    assertThat(s.nearestDataCoord(1.5, 0.5)).isEqualTo([1, 0]);
    assertThat(s.nearestDataCoord(0.5, 3.5)).isEqualTo([0, 3]);

    // Perturbed.
    assertThat(s.nearestDataCoord(0.52, 1.48)).isEqualTo([0, 1]);

    // Slightly closer.
    assertThat(s.nearestDataCoord(0.5, 0.6)).isEqualTo([0, 1]);
    assertThat(s.nearestDataCoord(0.6, 0.5)).isEqualTo([1, 0]);
    assertThat(s.nearestDataCoord(1.4, 1.5)).isEqualTo([0, 1]);
    assertThat(s.nearestDataCoord(1.6, 1.5)).isEqualTo([2, 1]);
    assertThat(s.nearestDataCoord(1.5, 1.4)).isEqualTo([1, 0]);
    assertThat(s.nearestDataCoord(1.5, 1.6)).isEqualTo([1, 2]);
});

suite.test('nearestCheckCoord-either', () => {
    let s = new SurfaceCodeLayout(4, 4);

    // Directly on the center.
    assertThat(s.nearestCheckCoord(0.5, 0.5)).isEqualTo([0, 0]);
    assertThat(s.nearestCheckCoord(1.5, 1.5)).isEqualTo([1, 1]);
    assertThat(s.nearestCheckCoord(0.5, 2.5)).isEqualTo([0, 2]);

    // Perturbed.
    assertThat(s.nearestCheckCoord(0.52, 0.48)).isEqualTo([0, 0]);

    // Slightly closer.
    assertThat(s.nearestCheckCoord(1.5, 0.6)).isEqualTo([1, 1]);
    assertThat(s.nearestCheckCoord(1.5, 2.4)).isEqualTo([1, 1]);
    assertThat(s.nearestCheckCoord(1.5, 2.6)).isEqualTo([1, 3]);
});

suite.test('nearestCheckCoord-xz', () => {
    let s = new SurfaceCodeLayout(4, 4);

    // Round to nearest Z.
    assertThat(s.nearestCheckCoord(0.52, 0.52, Z_AXIS)).isEqualTo([0, 0]);
    assertThat(s.nearestCheckCoord(1.48, 0.52, Z_AXIS)).isEqualTo([0, 0]);
    assertThat(s.nearestCheckCoord(1.52, 0.52, Z_AXIS)).isEqualTo([2, 0]);

    // Round to nearest X.
    assertThat(s.nearestCheckCoord(0.52, 0.52, X_AXIS)).isEqualTo([1, 1]);
    assertThat(s.nearestCheckCoord(0.52, 2.48, X_AXIS)).isEqualTo([1, 1]);
    assertThat(s.nearestCheckCoord(0.52, 2.52, X_AXIS)).isEqualTo([1, 3]);
});

suite.test('fullContiguousBorderTouching-invalids', () => {
    let centerHole = parseLayoutDiagram(`
        +-+-
        |@|·
        +-+-
    `);
    assertThat(centerHole.fullContiguousBorderTouching(BorderLoc.right(2, 1))).isEqualTo(undefined);
    assertThat(centerHole.fullContiguousBorderTouching(BorderLoc.right(200, 1))).isEqualTo(undefined);

    let noHole = parseLayoutDiagram(`
        +-+-
        |·|·
        +-+-
    `);
    assertThat(noHole.fullContiguousBorderTouching(BorderLoc.right(1, 1))).isEqualTo(undefined);

    let insideHole = parseLayoutDiagram(`
        +-+-
        |@@·
        +-+-
    `);
    assertThat(insideHole.fullContiguousBorderTouching(BorderLoc.right(1, 1))).isEqualTo(undefined);

    let borderHole = parseLayoutDiagram(`
        +-+
        @·|
        +-+
    `);
    assertThat(borderHole.fullContiguousBorderTouching(BorderLoc.left(1, 0))).isEqualTo(undefined);
});

suite.test('fullContiguousBorderTouching-insideUnitHole', () => {
    let centerHole = parseLayoutDiagram(`
        +-+-
        |@|·
        +-+-
    `);

    // Inside of hole cycle goes counter-clockwise.
    assertThat(centerHole.fullContiguousBorderTouching(BorderLoc.right(1, 1))).isEqualTo({
        locs: [
            BorderLoc.right(1, 1),
            BorderLoc.top(1, 1),
            BorderLoc.left(1, 1),
            BorderLoc.bottom(1, 1)
        ],
        cycle: true,
        axis: Z_AXIS,
    });

    // Outside of hole cycle goes clockwise.
    assertThat(centerHole.fullContiguousBorderTouching(BorderLoc.right(1, 1).backside())).isEqualTo({
        locs: [
            BorderLoc.right(1, 1).backside(),
            BorderLoc.bottom(1, 1).backside(),
            BorderLoc.left(1, 1).backside(),
            BorderLoc.top(1, 1).backside()
        ],
        cycle: true,
        axis: Z_AXIS,
    });
});

suite.test('fullContiguousBorderTouching-borderUnitHole', () => {
    let borderHoleOfDifferentType = parseLayoutDiagram(`
        +-+
        |·|
        @-+
    `);
    assertThat(borderHoleOfDifferentType.fullContiguousBorderTouching(BorderLoc.right(0, 2))).isEqualTo({
        locs: [
            BorderLoc.right(0, 2),
            BorderLoc.top(0, 2),
        ],
        cycle: false,
        axis: X_AXIS,
    });

    let borderHoleOfSameType = parseLayoutDiagram(`
        ·|·
        @@-
        ·|·
    `);
    assertThat(borderHoleOfSameType.fullContiguousBorderTouching(BorderLoc.right(1, 1))).isEqualTo({
        locs: [
            BorderLoc.right(1, 1),
            BorderLoc.top(1, 1),
            BorderLoc.top(0, 1),
            BorderLoc.right(-1, 0),
            BorderLoc.bottom(0, -1),
            BorderLoc.bottom(1, -1),
            BorderLoc.bottom(2, -1),
            BorderLoc.left(3, 0),
            BorderLoc.left(3, 1),
            BorderLoc.left(3, 2),
            BorderLoc.top(2, 3),
            BorderLoc.top(1, 3),
            BorderLoc.top(0, 3),
            BorderLoc.right(-1, 2),
            BorderLoc.bottom(0, 1),
            BorderLoc.bottom(1, 1),
        ],
        cycle: true,
        axis: X_AXIS,
    });

    let borderHoleOfSameTypeAsOneWall = parseLayoutDiagram(`
        -+-+
        ·|·|
        @@-+
        ·|·|
        -+-+
    `);
    assertThat(borderHoleOfSameTypeAsOneWall.fullContiguousBorderTouching(BorderLoc.right(1, 2))).isEqualTo({
        locs: [
            BorderLoc.right(-1, 4),
            BorderLoc.right(-1, 3),
            BorderLoc.bottom(0, 2),
            BorderLoc.bottom(1, 2),
            BorderLoc.right(1, 2),
            BorderLoc.top(1, 2),
            BorderLoc.top(0, 2),
            BorderLoc.right(-1, 1),
            BorderLoc.right(-1, 0),
        ],
        cycle: false,
        axis: X_AXIS,
    });
});

suite.test('fullContiguousBorderTouching-biggerHole', () => {
    let centerHole = parseLayoutDiagram(`
        +-+-+-+
        |@@@@@|
        +-+@@@+
        |·|@@@|
        +-+-+-+
    `);

    assertThat(centerHole.fullContiguousBorderTouching(BorderLoc.left(1, 1))).isEqualTo({
        locs: [
            BorderLoc.left(1, 1),
            BorderLoc.bottom(1, 1),
            BorderLoc.bottom(2, 1),
            BorderLoc.left(3, 2),
            BorderLoc.left(3, 3),
            BorderLoc.bottom(3, 3),
            BorderLoc.bottom(4, 3),
            BorderLoc.bottom(5, 3),
            BorderLoc.right(5, 3),
            BorderLoc.right(5, 2),
            BorderLoc.right(5, 1),
            BorderLoc.top(5, 1),
            BorderLoc.top(4, 1),
            BorderLoc.top(3, 1),
            BorderLoc.top(2, 1),
            BorderLoc.top(1, 1),
        ],
        cycle: true,
        axis: Z_AXIS,
    });
});

suite.test('fullContiguousBorderTouching-mixedHole', () => {
    let holeCutByOtherHoles = parseLayoutDiagram(`
        ·|·|·|·
        -+-@-+-
        ·|H@·|·
        -+-@-+-
        ·|·@H|·
        -+-@-+-
        ·|·|·|·
    `);
    assertThat(holeCutByOtherHoles.fullContiguousBorderTouching(BorderLoc.right(3, 1))).isEqualTo({
        locs: [
            BorderLoc.right(3, 3),
            BorderLoc.right(3, 2),
            BorderLoc.right(3, 1),
            BorderLoc.top(3, 1),
            BorderLoc.left(3, 1),
        ],
        cycle: false,
        axis: X_AXIS,
    });

    let holePartiallyCutByOtherHole = parseLayoutDiagram(`
        ·|·|·
        -+-@-
        ·|H@·
        -+-@-
        ·|·|·
    `);
    assertThat(holePartiallyCutByOtherHole.fullContiguousBorderTouching(BorderLoc.right(3, 1))).isEqualTo({
        locs: [
            BorderLoc.left(3, 3),
            BorderLoc.bottom(3, 3),
            BorderLoc.right(3, 3),
            BorderLoc.right(3, 2),
            BorderLoc.right(3, 1),
            BorderLoc.top(3, 1),
            BorderLoc.left(3, 1),
        ],
        cycle: false,
        axis: X_AXIS,
    });
});
