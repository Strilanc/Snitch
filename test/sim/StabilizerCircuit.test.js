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
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'

let suite = new Suite('StabilizerCircuitState');

suite.test('teleport', () => {
    let c = new StabilizerCircuitState();

    // Pre-shared entanglement.
    let a = c.addOffQubit();
    let b = c.addOffQubit();
    c.h(a);
    c.h(b);
    c.cz(a, b);
    c.h(b);

    // Entangled message.
    let e = c.addOffQubit();
    let m = c.addOffQubit();
    c.h(e);
    c.h(m);
    c.cz(e, m);
    c.h(m);

    // Teleport message.
    c.h(a);
    c.cz(m, a);
    c.h(a);
    c.h(m);
    if (c.measure(a)) {
        c.x(b);
    }
    if (c.measure(m)) {
        c.z(b);
    }

    // Unmake entanglement between b and e.
    c.h(b);
    c.cz(e, b);
    c.h(b);
    c.h(e);

    // They should be back into the off state.
    assertFalse(c.measure(b));
    assertFalse(c.measure(e));
});
