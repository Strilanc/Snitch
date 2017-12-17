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
    "surface-setup-10x10",
    millis(1),
    () => new SurfaceCode(10, 10).cycle());

perfGoal(
    "surface-setup-20x20",
    millis(4),
    () => new SurfaceCode(20, 20).cycle());

perfGoal(
    "surface-setup-30x30",
    millis(20),
    () => new SurfaceCode(30, 30).cycle());

perfGoal(
    "surface-cycle-10x10",
    micros(150),
    s => s.cycle(),
    new SurfaceCode(10, 10));

perfGoal(
    "surface-cycle-20x20",
    micros(600),
    s => s.cycle(),
    new SurfaceCode(20, 20));

perfGoal(
    "surface-cycle-30x30",
    millis(2),
    s => s.cycle(),
    new SurfaceCode(30, 30));

perfGoal(
    "surface-cycle-40x40",
    millis(5),
    s => s.cycle(),
    new SurfaceCode(40, 40));

perfGoal(
    "surface-cycle-50x50",
    millis(7),
    s => s.cycle(),
    new SurfaceCode(50, 50));
