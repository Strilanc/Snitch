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
import {equate} from 'src/base/Equate.js'
import {seq} from 'src/base/Seq.js'

/**
 * Toggles whether items from the mask set are in the destination set.
 * @param {!Set.<T>} dst
 * @param {!Set.<T>} mask
 * @mutates dst
 * @template T
 */
function set_xor_inline(dst, mask) {
    for (let e of mask) {
        if (dst.has(e)) {
            dst.delete(e);
        } else {
            dst.add(e);
        }
    }
}

/**
 * Returns the set of elements that are in exactly one of the given sets.
 * @param {!Set.<T>} a
 * @param {!Set.<T>} b
 * @returns {!Set.<T>}
 * @template T
 */
function set_xor(a, b) {
    let result = new Set(a);
    set_xor_inline(result, b);
    return result;
}

/**
 * A product of quantum observables, with eigenvalues required to equal to +1 or -1, identified by strings.
 */
class ObservableProduct {
    /**
     * Creates an observable product using the given ids and constant sign.
     * @param {!Set.<!string>=} observableIds The set of +1/-1 observables multiplied together to make this product.
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
            return new ObservableProduct(new Set(this.ids), -this.sign);
        }
        return this.clone().times_inline(other);
    }

    /**
     * @param {!Array.<!ObservableProduct>} several
     * @returns {!ObservableProduct}
     */
    static product(several) {
        if (several.length === 0) {
            return new ObservableProduct();
        }
        let result = several[0].clone();
        for (let i = 1; i < several.length; i++) {
            result.times_inline(several[i]);
        }
        return result;
    }

    /**
     * @param {!ObservableProduct} other
     * @returns {!ObservableProduct}
     */
    times_inline(other) {
        this.sign *= other.sign;
        set_xor_inline(this.ids, other.ids);
        return this;
    }

    /**
     * @returns {!ObservableProduct}
     */
    clone() {
        return new ObservableProduct(new Set(this.ids), this.sign);
    }

    /**
     * Describes the observable product.
     * @returns {!string}
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

export {ObservableProduct}
