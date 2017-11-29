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

import {perfGoal, millis, micros} from "test_perf/TestPerfUtil.js"
import {ObservableProduct} from "src/sim/ObservableProduct.js"

function productRange(prefix, count) {
    let set = new Set();
    for (let i = 0; i < count; i++) {
        set.add(prefix + i);
    }
    return new ObservableProduct(set);
}

perfGoal(
    "ObservableProduct.times(10)",
    micros(10),
    v => v[0].times_inline(v[1]),
    [productRange('a', 10), productRange('b', 10).times(productRange('a', 5))]);

perfGoal(
    "ObservableProduct.times(10000)",
    millis(5),
    v => v[0].times(v[1]),
    [productRange('a', 10000), productRange('b', 10000).times(productRange('a', 500))]);

perfGoal(
    "ObservableProduct.times_inline(10)",
    micros(3),
    v => v[0].times_inline(v[1]),
    [productRange('a', 10), productRange('b', 10).times(productRange('a', 5))]);

perfGoal(
    "ObservableProduct.times_inline(10000)",
    millis(2),
    v => v[0].times_inline(v[1]),
    [productRange('a', 10000), productRange('b', 10000).times(productRange('a', 500))]);
