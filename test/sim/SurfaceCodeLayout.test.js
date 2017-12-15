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
import {SurfaceCodeLayout} from 'src/sim/SurfaceCodeLayout.js'
import {X_AXIS, Z_AXIS} from "src/sim/Util.js";

let suite = new Suite('StabilizerQubit');

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
