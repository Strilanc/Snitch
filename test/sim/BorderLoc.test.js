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
import {BorderLoc} from 'src/sim/BorderLoc.js'

let suite = new Suite('BorderLoc');

suite.test('construct', () => {
    let b = new BorderLoc(2, 3, 1, 0);
    assertThat(b.i).isEqualTo(2);
    assertThat(b.j).isEqualTo(3);
    assertThat(b.di).isEqualTo(1);
    assertThat(b.dj).isEqualTo(0);

    let b2 = new BorderLoc(4, 5, 0, -1);
    assertThat(b2.i).isEqualTo(4);
    assertThat(b2.j).isEqualTo(5);
    assertThat(b2.di).isEqualTo(0);
    assertThat(b2.dj).isEqualTo(-1);

    assertThrows(() => new BorderLoc(0, 0, 2, 0));
    assertThrows(() => new BorderLoc(0, 0, 1, 1));
    assertThrows(() => new BorderLoc(0, 0, 0, 0));
});

suite.test('isEqualTo', () => {
    let b = new BorderLoc(2, 3, 1, 0);
    assertThat(b).isEqualTo(b);
    assertThat(b).isEqualTo(new BorderLoc(2, 3, 1, 0));
    assertThat(b).isNotEqualTo(new BorderLoc(4, 3, 1, 0));
    assertThat(b).isNotEqualTo(new BorderLoc(2, 4, 1, 0));
    assertThat(b).isNotEqualTo(new BorderLoc(2, 3, -1, 0));
    assertThat(b).isNotEqualTo(new BorderLoc(2, 3, 0, 1));
});

suite.test('directions', () => {
    assertThat(BorderLoc.left(3, 3)).isEqualTo(new BorderLoc(3, 3, -1, 0));
    assertThat(BorderLoc.right(3, 3)).isEqualTo(new BorderLoc(3, 3, +1, 0));
    assertThat(BorderLoc.top(3, 3)).isEqualTo(new BorderLoc(3, 3, 0, -1));
    assertThat(BorderLoc.bottom(3, 3)).isEqualTo(new BorderLoc(3, 3, 0, +1));
});

suite.test('backside', () => {
    assertThat(BorderLoc.left(3, 3).backside().backside()).isEqualTo(BorderLoc.left(3, 3));
    assertThat(BorderLoc.left(3, 3).backside()).isEqualTo(BorderLoc.right(2, 3));
    assertThat(BorderLoc.top(5, 6).backside()).isEqualTo(BorderLoc.bottom(5, 5));
});

suite.test('nextRightHandAlongWall', () => {
    assertThat(BorderLoc.left(0, 0).nextRightHandAlongWall()).isEqualTo(BorderLoc.left(0, 1));
    assertThat(BorderLoc.top(0, 0).nextRightHandAlongWall()).isEqualTo(BorderLoc.top(-1, 0));
    assertThat(BorderLoc.right(0, 0).nextRightHandAlongWall()).isEqualTo(BorderLoc.right(0, -1));
    assertThat(BorderLoc.bottom(0, 0).nextRightHandAlongWall()).isEqualTo(BorderLoc.bottom(1, 0));
});

suite.test('nextRightHandAroundCorner', () => {
    assertThat(BorderLoc.left(0, 0).nextRightHandAroundCorner()).isEqualTo(BorderLoc.top(-1, 1));
    assertThat(BorderLoc.top(0, 0).nextRightHandAroundCorner()).isEqualTo(BorderLoc.right(-1, -1));
    assertThat(BorderLoc.right(0, 0).nextRightHandAroundCorner()).isEqualTo(BorderLoc.bottom(1, -1));
    assertThat(BorderLoc.bottom(0, 0).nextRightHandAroundCorner()).isEqualTo(BorderLoc.left(1, 1));
});

suite.test('nextRightHandWithinSameCell', () => {
    assertThat(BorderLoc.left(0, 0).nextRightHandWithinSameCell()).isEqualTo(BorderLoc.bottom(0, 0));
    assertThat(BorderLoc.bottom(0, 0).nextRightHandWithinSameCell()).isEqualTo(BorderLoc.right(0, 0));
    assertThat(BorderLoc.right(0, 0).nextRightHandWithinSameCell()).isEqualTo(BorderLoc.top(0, 0));
    assertThat(BorderLoc.top(0, 0).nextRightHandWithinSameCell()).isEqualTo(BorderLoc.left(0, 0));
});

suite.test('nextLeftHandAlongWall', () => {
    assertThat(BorderLoc.left(0, 0).nextLeftHandAlongWall()).isEqualTo(BorderLoc.left(0, -1));
    assertThat(BorderLoc.top(0, 0).nextLeftHandAlongWall()).isEqualTo(BorderLoc.top(1, 0));
    assertThat(BorderLoc.right(0, 0).nextLeftHandAlongWall()).isEqualTo(BorderLoc.right(0, 1));
    assertThat(BorderLoc.bottom(0, 0).nextLeftHandAlongWall()).isEqualTo(BorderLoc.bottom(-1, 0));
});

suite.test('nextLeftHandAroundCorner', () => {
    assertThat(BorderLoc.left(0, 0).nextLeftHandAroundCorner()).isEqualTo(BorderLoc.bottom(-1, -1));
    assertThat(BorderLoc.top(0, 0).nextLeftHandAroundCorner()).isEqualTo(BorderLoc.left(1, -1));
    assertThat(BorderLoc.right(0, 0).nextLeftHandAroundCorner()).isEqualTo(BorderLoc.top(1, 1));
    assertThat(BorderLoc.bottom(0, 0).nextLeftHandAroundCorner()).isEqualTo(BorderLoc.right(-1, 1));
});

suite.test('nextLeftHandWithinSameCell', () => {
    assertThat(BorderLoc.left(0, 0).nextLeftHandWithinSameCell()).isEqualTo(BorderLoc.top(0, 0));
    assertThat(BorderLoc.top(0, 0).nextLeftHandWithinSameCell()).isEqualTo(BorderLoc.right(0, 0));
    assertThat(BorderLoc.right(0, 0).nextLeftHandWithinSameCell()).isEqualTo(BorderLoc.bottom(0, 0));
    assertThat(BorderLoc.bottom(0, 0).nextLeftHandWithinSameCell()).isEqualTo(BorderLoc.left(0, 0));
});
