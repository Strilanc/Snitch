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
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'

let suite = new Suite('MeasurementResult');

suite.test('construct', () => {

    let o1 = new ObservableProduct(new Set(['b', 'a']), -1);
    let m1 = new MeasurementResult(o1, +1);
    assertThat(m1.eliminatedId).isEqualTo('a');
    assertThat(m1.measuredObservable).isEqualTo(o1);
    assertThat(m1.result).isEqualTo(+1);
    assertThat(m1.eliminationUnit).isEqualTo(o1);

    let o2 = new ObservableProduct(new Set(['c']), -1);
    let m2 = new MeasurementResult(o2, -1);
    assertThat(m2.eliminatedId).isEqualTo('c');
    assertThat(m2.measuredObservable).isEqualTo(o2);
    assertThat(m2.result).isEqualTo(-1);
    assertThat(m2.eliminationUnit).isEqualTo(o2.times(-1));

    let o3 = new ObservableProduct(new Set(), -1);
    let m3 = new MeasurementResult(o3, -1);
    assertThat(m3.eliminatedId).isEqualTo(undefined);
    assertThat(m3.measuredObservable).isEqualTo(o3);
    assertThat(m3.result).isEqualTo(-1);
    assertThat(m3.eliminationUnit).isEqualTo(new ObservableProduct());

    assertThrows(() => new MeasurementResult(new ObservableProduct(), -1));
    assertThrows(() => new MeasurementResult(new ObservableProduct(new Set(), -1), +1));
    //noinspection JSCheckFunctionSignatures
    assertThrows(() => new MeasurementResult('a'));
    assertThrows(() => new MeasurementResult(new ObservableProduct(), 2));
    //noinspection JSCheckFunctionSignatures
    assertThrows(() => new MeasurementResult(new ObservableProduct(), 'a'));
});

suite.test('isEqualTo', () => {
    let t = new MeasurementResult(new ObservableProduct(), +1);
    let a = new MeasurementResult(new ObservableProduct(new Set(['a'])), +1);
    assertTrue(t.isEqualTo(t));
    assertTrue(a.isEqualTo(a));
    assertFalse(a.isEqualTo(t));

    assertThat(a).isEqualTo(a);
    assertThat(a).isNotEqualTo(t);
    assertThat(t).isEqualTo(t);
    assertThat(a).isNotEqualTo(new MeasurementResult(new ObservableProduct(new Set(['a'])), -1));
    assertThat(a).isNotEqualTo(new MeasurementResult(new ObservableProduct(new Set(['a']), -1), -1));
    assertThat(a).isNotEqualTo(new MeasurementResult(new ObservableProduct(new Set(['a']), -1), +1));
    assertThat(a).isNotEqualTo(new MeasurementResult(new ObservableProduct(new Set(['b'])), -1));

    assertThat(a).isNotEqualTo('');
    assertThat(a).isNotEqualTo(undefined);
});

suite.test('rewriteObservableProduct', () => {
    let a = new ObservableProduct(new Set(['a']));
    let b = new ObservableProduct(new Set(['b']));
    let c = new ObservableProduct(new Set(['c']));
    let t = new ObservableProduct(new Set(), -1);

    let m = new MeasurementResult(a.times(b), -1);
    assertThat(m.rewriteObservableProduct(b)).isEqualTo(b);
    assertThat(m.rewriteObservableProduct(c)).isEqualTo(c);
    assertThat(m.rewriteObservableProduct(a)).isEqualTo(b.times(t));
    assertThat(m.rewriteObservableProduct(a.times(b))).isEqualTo(t);
    assertThat(m.rewriteObservableProduct(a.times(c))).isEqualTo(b.times(c).times(t));
    assertThat(m.rewriteObservableProduct(a.times(b).times(t))).isEqualTo(new ObservableProduct());

    let m2 = new MeasurementResult(a.times(b), 1);
    assertThat(m2.rewriteObservableProduct(b)).isEqualTo(b);
    assertThat(m2.rewriteObservableProduct(c)).isEqualTo(c);
    assertThat(m2.rewriteObservableProduct(a)).isEqualTo(b);
    assertThat(m2.rewriteObservableProduct(a.times(b))).isEqualTo(new ObservableProduct());
    assertThat(m2.rewriteObservableProduct(a.times(c))).isEqualTo(b.times(c));
    assertThat(m2.rewriteObservableProduct(a.times(b).times(t))).isEqualTo(t);

    let m3 = new MeasurementResult(new ObservableProduct(), 1);
    assertThat(m3.rewriteObservableProduct(a)).isEqualTo(a);
    assertThat(m3.rewriteObservableProduct(t)).isEqualTo(t);

    let m4 = new MeasurementResult(new ObservableProduct(), 1);
    assertThat(m4.rewriteObservableProduct(a)).isEqualTo(a);
    assertThat(m4.rewriteObservableProduct(t)).isEqualTo(t);
});

suite.test('toString', () => {
    assertThat(new MeasurementResult(new ObservableProduct(new Set(['a', 'b'])), -1).toString()).isEqualTo(
        'a*b == -1 causing a ==> -b');
    assertThat(new MeasurementResult(new ObservableProduct(new Set(['a', 'b'])), +1).toString()).isEqualTo(
        'a*b == 1 causing a ==> b');
    assertThat(new MeasurementResult(new ObservableProduct(new Set(), -1), -1).toString()).isEqualTo(
        '-1 == -1');
    assertThat(new MeasurementResult(new ObservableProduct(), +1).toString()).isEqualTo(
        '1 == 1');
});
