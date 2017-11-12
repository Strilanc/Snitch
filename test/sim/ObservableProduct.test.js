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

import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {ObservableProduct} from "src/sim/ObservableProduct.js"

let suite = new Suite("ObservableProduct");

suite.test("construct", () => {
    let r = new ObservableProduct(new Set(['a']), +1);
    assertThat(r.ids).isEqualTo(new Set(['a']));
    assertThat(r.sign).isEqualTo(+1);

    let s = new ObservableProduct(new Set(['c', 'b']), -1);
    assertThat(s.ids).isEqualTo(new Set(['c', 'b']));
    assertThat(s.sign).isEqualTo(-1);

    let t = new ObservableProduct();
    assertThat(t.ids).isEqualTo(new Set());
    assertThat(t.sign).isEqualTo(+1);

    //noinspection JSCheckFunctionSignatures
    assertThrows(() => new ObservableProduct('a'));
    //noinspection JSCheckFunctionSignatures
    assertThrows(() => new ObservableProduct(['a']));
    assertThrows(() => new ObservableProduct(new Set(['a']), 2));
    assertThrows(() => new ObservableProduct(new Set(['a']), 0));
    //noinspection JSCheckFunctionSignatures
    assertThrows(() => new ObservableProduct(new Set(['a']), '1'));
});

suite.test("isEqualTo", () => {
    let a = new ObservableProduct(new Set(['a']), +1);

    assertTrue(new ObservableProduct().isEqualTo(new ObservableProduct()));
    assertFalse(new ObservableProduct().isEqualTo(a));

    assertThat(new ObservableProduct()).isEqualTo(new ObservableProduct(new Set(), +1));
    assertThat(new ObservableProduct()).isNotEqualTo(a);
    assertThat(new ObservableProduct()).isNotEqualTo(new ObservableProduct(new Set(['a']), -1));
    assertThat(new ObservableProduct()).isNotEqualTo(new ObservableProduct(new Set(), -1));

    assertThat(a).isEqualTo(new ObservableProduct(new Set(['a'])));
    assertThat(a).isNotEqualTo(new ObservableProduct(new Set(['b'])));

    assertThat(a).isNotEqualTo('');
    assertThat(a).isNotEqualTo(undefined);
});

suite.test("times", () => {
    let e = new ObservableProduct();
    let n = new ObservableProduct(new Set(), -1);
    let a = new ObservableProduct(new Set(['a']));
    let b = new ObservableProduct(new Set(['b']));
    let ab = new ObservableProduct(new Set(['a', 'b']));
    let c = new ObservableProduct(new Set(['c']));

    for (let r of [e, n, a, b, ab, c]) {
        assertThat(e.times(r)).isEqualTo(r);
        assertThat(r.times(e)).isEqualTo(r);
        assertThat(r.times(r)).isEqualTo(e);
    }

    assertThat(a.times(b)).isEqualTo(ab);
    assertThat(b.times(a)).isEqualTo(ab);
    assertThat(ab.times(a)).isEqualTo(b);
    assertThat(ab.times(b)).isEqualTo(a);
    assertThat(ab.times(c)).isEqualTo(new ObservableProduct(new Set(['a', 'b', 'c'])));
    assertThat(a.times(n)).isEqualTo(new ObservableProduct(new Set(['a']), -1));

    assertThat(ab.times(1)).isEqualTo(ab);
    assertThat(e.times(-1)).isEqualTo(n);
    assertThat(ab.times(-1)).isEqualTo(ab.times(n));
});

suite.test("toString", () => {
    assertThat(new ObservableProduct(new Set(), +1).toString()).isEqualTo('1');
    assertThat(new ObservableProduct(new Set(), -1).toString()).isEqualTo('-1');
    assertThat(new ObservableProduct(new Set(['b']), +1).toString()).isEqualTo('b');
    assertThat(new ObservableProduct(new Set(['b']), -1).toString()).isEqualTo('-b');
    assertThat(new ObservableProduct(new Set(['b', 'a', 'x1']), +1).toString()).isEqualTo('a*b*x1');
    assertThat(new ObservableProduct(new Set(['b', 'a', 'x1']), -1).toString()).isEqualTo('-a*b*x1');
});
