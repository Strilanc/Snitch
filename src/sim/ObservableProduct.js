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

import {DetailedError} from "src/base/DetailedError.js"
import {equate} from "src/base/Equate.js"
import {seq} from "src/base/Seq.js"

/**
 * Returns the set of elements that are in exactly one of the given sets.
 * @param {!Set.<T>} a
 * @param {!Set.<T>} b
 * @returns {!Set.<T>}
 * @template T
 */
function set_xor(a, b) {
    let result = new Set();
    for (let [x, y] of [[a, b], [b, a]]) {
        for (let e of x) {
            if (!y.has(e)) {
                result.add(e)
            }
        }
    }
    return result;
}

/**
 * A product of quantum observables, with eigenvalues required to equal to +1 or -1, identified by strings.
 */
class ObservableProduct {
    /**
     * Creates an observable product using the given ids and constant sign.
     * @param {!Set.<!String>=} observableIds The set of +1/-1 observables multiplied together to make this product.
     * @param {!int=} sign A constant +1 or -1 factor.
     */
    constructor(observableIds = new Set(), sign = +1) {
        if (!(observableIds instanceof Set) || (sign !== -1 && sign !== 1)) {
            throw new DetailedError('Bad args.', {observableIds, sign});
        }
        this.ids = observableIds;
        this.sign = sign;
    }

    /**
     * Returns the result of multiplying another observable, or +1 or -1, onto this one.
     * @param {!int|!ObservableProduct} other
     * @returns {!ObservableProduct}
     */
    times(other) {
        if (other === +1) {
            return this
        }
        if (other === -1) {
            return new ObservableProduct(this.ids, -this.sign);
        }
        let ids = set_xor(this.ids, other.ids);
        let sign = this.sign * other.sign;
        return new ObservableProduct(ids, sign);
    }

    /**
     * Describes the observable product.
     * @returns {!String}
     */
    toString() {
        if (this.ids.size === 0) {
            return '' + this.sign;
        }
        return (this.sign === 1 ? '' : '-') + seq(this.ids).sorted().join('*');
    }

    /**
     * Determines if two observable products are the same.
     * @param {!ObservableProduct|*} other
     * @returns {!boolean}
     */
    isEqualTo(other) {
        return other instanceof ObservableProduct && equate(this.ids, other.ids) && this.sign === other.sign;
    }
}

export {ObservableProduct};
