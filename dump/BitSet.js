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

class BitSet {
    constructor(capacity) {
        this.mask = new Uint16Array(Math.ceil(capacity / 16));
        this.seek = new Uint16Array(Math.ceil(capacity / 16) + 1);
        this.seek[0] = 0xFFFF;
    }

    any() {
        return this.seek[0] !== 0xFFFF;
    }

    first() {
        let p = this.seek[0];
        let r = this.mask[p];
        r -= r & (r - 1);
        let b = Math.round(Math.log2(r));
        return (p<<4) + b;
    }

    has(i) {
        let word = i >> 4;
        let bit = i & 0xF;
        return (this.mask[word] & (1 << bit)) !== 0;
    }

    clone() {
        let b = new BitSet(0);
        b.mask = new Uint16Array(this.mask);
        b.seek = new Uint16Array(this.seek);
        return b;
    }

    bits() {
        let result = [];
        let p = 0;
        while (this.seek[p] !== 0xFFFF) {
            p = this.seek[p];

            let m = this.mask[p];
            for (let i = 0; i < 16; i++) {
                if ((m & (1 << i)) !== 0) {
                    result.push((p<<4) + i);
                }
            }
        }
        return result;
    }

    _find_previous(start, goal) {
        let p = start;
        while (true) {
            let p2 = this.seek[p];
            if (p2 >= goal) {
                return p;
            }
            p = p2;
        }
    }

    _inline_clean_seeks() {
        let p = 0;
        while (this.seek[p] !== 0xFFFF) {
            let q = this.seek[p];
            while (q !== 0xFFFF && this.mask[q] === 0) {
                q = this.seek[q];
            }
            this.seek[p] = q;
        }
    }

    _inline_merge_seeks(other) {
        let pThis = 0;
        let pOther = 0;
        while (other.seek[pOther] !== 0xFFFF) {
            pOther = other.seek[pOther];
            pThis = this._find_previous(pThis, pOther);
            this.seek[pThis] = pOther;
            this.seek[pOther] = other.seek[pOther];
        }
    }

    inline_xor(other) {
        let result = [];

        let p = 0;
        while (other.seek[p] !== 0xFFFF) {
            p = other.seek[p];
            this.mask[p] ^= other.mask[p];
        }

        this._inline_merge_seeks(other);
        this._inline_clean_seeks();

        return result;
    }

    toString() {
        return '{' + this.bits().join(', ') + '}'
    }
}

export {BitSet};
