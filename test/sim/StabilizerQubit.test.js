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
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'

let suite = new Suite('StabilizerQubit');

suite.test('construct', () => {
    let x = new ObservableProduct(new Set(['x']));
    let z = new ObservableProduct(new Set(['z']));
    let q = new StabilizerQubit(x, z, -1);
    assertThat(q.obsX).isEqualTo(x);
    assertThat(q.obsZ).isEqualTo(z);
    assertThat(q.signY).isEqualTo(-1);

    let a = new ObservableProduct(new Set(['a', 'aa']), -1);
    let b = new ObservableProduct(new Set(['b']));
    let q2 = new StabilizerQubit(a, b);
    assertThat(q2.obsX).isEqualTo(a);
    assertThat(q2.obsZ).isEqualTo(b);
    assertThat(q2.signY).isEqualTo(+1);

    assertThrows(() => new StabilizerQubit(x, z, 2));
    //noinspection JSCheckFunctionSignatures
    assertThrows(() => new StabilizerQubit(x, z, '2'));
    //noinspection JSCheckFunctionSignatures
    assertThrows(() => new StabilizerQubit(x, 'a', 1));
    //noinspection JSCheckFunctionSignatures
    assertThrows(() => new StabilizerQubit('a', z, 1));
});

suite.test('obsY', () => {
    let x = new ObservableProduct(new Set(['x']));
    let z = new ObservableProduct(new Set(['z']));
    assertThat(new StabilizerQubit(x, z, 1).obsY).isEqualTo(x.times(z));
    assertThat(new StabilizerQubit(x, z, -1).obsY).isEqualTo(x.times(z).times(-1));
    assertThat(new StabilizerQubit(x, z.times(-1), -1).obsY).isEqualTo(x.times(z));
});

suite.test('isEqualTo', () => {
    let t = new ObservableProduct(new Set(), -1);
    let x = new ObservableProduct(new Set(['x']));
    let y = new ObservableProduct(new Set(['y']));
    let z = new ObservableProduct(new Set(['z']));
    let a = new StabilizerQubit(x, z, -1);
    assertTrue(a.isEqualTo(a));
    assertFalse(a.isEqualTo(new StabilizerQubit(z, x, -1)));

    assertThat(a).isEqualTo(a);
    assertThat(a).isEqualTo(new StabilizerQubit(x, z, -1));
    assertThat(a).isNotEqualTo(new StabilizerQubit(z, x, -1));
    assertThat(a).isNotEqualTo(new StabilizerQubit(x, z, 1));
    assertThat(a).isNotEqualTo(new StabilizerQubit(x, y, -1));
    assertThat(a).isNotEqualTo(new StabilizerQubit(y, z, -1));
    assertThat(a).isNotEqualTo(new StabilizerQubit(x.times(t), z, -1));
});

suite.test('toString', () => {
    let x = new ObservableProduct(new Set(['x']));
    let z = new ObservableProduct(new Set(['a', 'z']), -1);
    assertThat(new StabilizerQubit(x, z, +1).toString()).isEqualTo('Q(X=x, Z=-a*z, Y=X*Z)');
    assertThat(new StabilizerQubit(x, z, -1).toString()).isEqualTo('Q(X=x, Z=-a*z, Y=-X*Z)');
});

suite.test('sqrt', () => {
    let x = new ObservableProduct(new Set(['x']));
    let z = new ObservableProduct(new Set(['z']));
    let q = new StabilizerQubit(x, z);

    // Check by expected observable changes including Y.
    assertThat(q.sqrtX().obsX).isEqualTo(q.obsX);
    assertThat(q.sqrtX().obsY).isEqualTo(q.obsZ.times(-1));
    assertThat(q.sqrtX().obsZ).isEqualTo(q.obsY);

    assertThat(q.sqrtY().obsX).isEqualTo(q.obsZ);
    assertThat(q.sqrtY().obsY).isEqualTo(q.obsY);
    assertThat(q.sqrtY().obsZ).isEqualTo(q.obsX.times(-1));

    assertThat(q.sqrtZ().obsX).isEqualTo(q.obsY.times(-1));
    assertThat(q.sqrtZ().obsY).isEqualTo(q.obsX);
    assertThat(q.sqrtZ().obsZ).isEqualTo(q.obsZ);

    // Check by qubit state.
    assertThat(q.sqrtX()).isEqualTo(new StabilizerQubit(x, x.times(z), -1));
    assertThat(q.sqrtY()).isEqualTo(new StabilizerQubit(z, x.times(-1), -1));
    assertThat(q.sqrtZ()).isEqualTo(new StabilizerQubit(x.times(z).times(-1), z, -1));

    // Doubles give X, Y, Z effects.
    assertThat(q.sqrtX().sqrtX()).isEqualTo(new StabilizerQubit(x, z.times(-1)));
    assertThat(q.sqrtY().sqrtY()).isEqualTo(new StabilizerQubit(x.times(-1), z.times(-1)));
    assertThat(q.sqrtZ().sqrtZ()).isEqualTo(new StabilizerQubit(x.times(-1), z));

    // XYZ = i
    assertThat(q.sqrtX().sqrtX().sqrtY().sqrtY().sqrtZ().sqrtZ()).isEqualTo(q);
    // XZY = -i
    assertThat(q.sqrtX().sqrtX().sqrtZ().sqrtZ().sqrtY().sqrtY()).isEqualTo(q);
    // √Z √Y √X = √Y
    assertThat(q.sqrtX().sqrtY().sqrtZ()).isEqualTo(q.sqrtY());
    // √Z √Y √X √Z √Y √X = -Y
    assertThat(q.sqrtX().sqrtY().sqrtZ().sqrtX().sqrtY().sqrtZ()).isEqualTo(q.sqrtY().sqrtY());
    // √X⁻¹·√Z⁻¹·√X = √Y
    assertThat(q.sqrtX().sqrtZ().sqrtX().sqrtX().sqrtX()).isEqualTo(q.sqrtY());
});

suite.test('cz', () => {
    let x1 = new ObservableProduct(new Set(['x1']));
    let z1 = new ObservableProduct(new Set(['z1']));
    let x2 = new ObservableProduct(new Set(['x2']));
    let z2 = new ObservableProduct(new Set(['z2']));
    let q1 = new StabilizerQubit(x1, z1);
    let q2 = new StabilizerQubit(x2, z2, -1);
    let [p1, p2] = q1.cz(q2);

    // Check by observable.
    assertThat(p1.obsX).isEqualTo(q1.obsX.times(q2.obsZ));
    assertThat(p1.obsY).isEqualTo(q1.obsY.times(q2.obsZ));
    assertThat(p1.obsZ).isEqualTo(q1.obsZ);
    assertThat(p2.obsX).isEqualTo(q2.obsX.times(q1.obsZ));
    assertThat(p2.obsY).isEqualTo(q2.obsY.times(q1.obsZ));
    assertThat(p2.obsZ).isEqualTo(q2.obsZ);

    // Check by state.
    assertThat(p1).isEqualTo(new StabilizerQubit(x1.times(z2), z1));
    assertThat(p2).isEqualTo(new StabilizerQubit(x2.times(z1), z2, -1));
});

suite.test('rewriteWithMeasurementResult', () => {
    let x = new ObservableProduct(new Set(['a', 'b']));
    let z = new ObservableProduct(new Set(['a', 'c']));
    let m = new MeasurementResult(new ObservableProduct(new Set(['b', 'd']), -1), -1);
    let q = new StabilizerQubit(x, z, -1);
    assertThat(q.rewriteWithMeasurementResult(m)).isEqualTo(
        new StabilizerQubit(new ObservableProduct(new Set(['a', 'd'])), z, -1));
});

suite.test('measureZ', () => {
    let x = new ObservableProduct(new Set(['a', 'b']));
    let z = new ObservableProduct(new Set(['a', 'c']));
    let q = new StabilizerQubit(x, z);
    let {new_state: p, result: m} = q.measureZ('e');
    assertThat(m.measuredObservable).isEqualTo(z);
    assertThat(p.obsZ).isEqualTo(new ObservableProduct(new Set(), m.result));
    assertThat(p.obsX).isEqualTo(new ObservableProduct(new Set(['e'])));

    let x2 = new ObservableProduct(new Set(['x']));
    let off = new StabilizerQubit(x2, new ObservableProduct());
    let {new_state: p2, result: m2} = off.measureZ('f');
    assertThat(p2.isEqualTo(off));
    assertThat(m2.result).isEqualTo(1);
    assertThat(m2.measuredObservable).isEqualTo(new ObservableProduct());
});
