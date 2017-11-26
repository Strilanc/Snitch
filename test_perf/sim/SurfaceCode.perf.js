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
import {SurfaceCode} from "src/sim/SurfaceCode.js"

perfGoal(
    "initial-cycle-10x10",
    millis(5),
    () => new SurfaceCode(10, 10).cycle());

perfGoal(
    "initial-cycle-20x20",
    millis(20),
    () => new SurfaceCode(20, 20).cycle());

perfGoal(
    "steady-cycle-10x10",
    millis(4),
    s => s.cycle(),
    new SurfaceCode(10, 10));

perfGoal(
    "steady-cycle-20x20",
    millis(20),
    s => s.cycle(),
    new SurfaceCode(20, 20));
