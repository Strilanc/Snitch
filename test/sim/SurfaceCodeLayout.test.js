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
    assertFalse(s.isCheckQubit(0, 0, false));
    assertTrue(s.isCheckQubit(0, 0, true));

    assertTrue(s.isDataQubit(0, 1));
    assertFalse(s.isCheckQubit(0, 1));
    assertFalse(s.isCheckQubit(0, 1, false));
    assertFalse(s.isCheckQubit(0, 1, true));

    assertTrue(s.isDataQubit(1, 0));
    assertFalse(s.isCheckQubit(1, 0));
    assertFalse(s.isCheckQubit(1, 0, false));
    assertFalse(s.isCheckQubit(1, 0, true));

    assertFalse(s.isDataQubit(1, 1));
    assertTrue(s.isCheckQubit(1, 1));
    assertTrue(s.isCheckQubit(1, 1, false));
    assertFalse(s.isCheckQubit(1, 1, true));
});
