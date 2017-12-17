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

import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {seq} from 'src/base/Seq.js'

/**
 * Records what measurement was done, what the result was, and how to use the result to eliminate a variable.
 */
class MeasurementResult {
    /**
     * @param {!ObservableProduct} measuredObservable What was measured.
     * @param {!int} result The result of the measurement.
     */
    constructor(measuredObservable, result) {
        if (!(measuredObservable instanceof ObservableProduct) || (result !== -1 && result !== 1)) {
            throw new DetailedError('Bad args.', {measuredObservable, result});
        }
        this.result = result;
        this.measuredObservable = measuredObservable;
        if (measuredObservable.ids.size > 0) {
            this.eliminatedId = seq(measuredObservable.ids).min();
            this.eliminationUnit = measuredObservable.times(result);
        } else {
            if (result !== measuredObservable.sign) {
                throw new DetailedError('Contradiction.', {measuredObservable, result});
            }
            this.eliminatedId = undefined;
            this.eliminationUnit = new ObservableProduct();
        }
    }

    /**
     * Attempts to use the measurement result to eliminate a variable from the given observable product.
     * @param {!ObservableProduct} obs The observable product to try to rewrite.
     * @returns {!ObservableProduct}
     */
    rewriteObservableProduct(obs) {
        if (this.eliminatedId === undefined || !obs.ids.has(this.eliminatedId)) {
            return obs;
        }
        return obs.times(this.eliminationUnit);
    }


    /**
     * @param {!ObservableProduct} obs The observable product to try to rewrite.
     * @returns {!ObservableProduct}
     */
    inline_rewriteObservableProduct(obs) {
        if (this.eliminatedId === undefined || !obs.ids.has(this.eliminatedId)) {
            return obs;
        }
        return obs.inline_times(this.eliminationUnit);
    }

    /**
     * Determines if two measurement results are equivalent.
     * @param {!MeasurementResult|*} other
     */
    isEqualTo(other) {
        return (
            other instanceof MeasurementResult &&
            this.result === other.result &&
            this.measuredObservable.isEqualTo(other.measuredObservable) &&
            this.eliminatedId === other.eliminatedId &&
            this.eliminationUnit.isEqualTo(other.eliminationUnit));
    }

    /**
     * Describes the measurement result.
     * @returns {!string}
     */
    toString() {
        if (this.eliminatedId === undefined) {
            return `${this.measuredObservable} == ${this.result}`;
        }
        let rhs = this.eliminationUnit.times(new ObservableProduct(new Set([this.eliminatedId])));
        return `${this.measuredObservable} == ${this.result} causing ${this.eliminatedId} ==> ${rhs}`;
    }
}

export {MeasurementResult};
