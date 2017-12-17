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
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'

/**
 * The state of all the qubits in a stabilizer circuit, with operations to mutate the state.
 */
class StabilizerCircuitState {
    /**
     * Initializes a new empty circuit state.
     */
    constructor() {
        this.qubitMap = new Map();
        this._idCounter = 0;
    }

    clone() {
        let r = new StabilizerCircuitState();
        r._idCounter = this._idCounter;
        for (let [k, v] of this.qubitMap.entries()) {
            r.qubitMap.set(k, v.clone());
        }
        return r;
    }

    /**
     * @returns {!int}
     * @private
     */
    _nextId() {
        return this._idCounter++;
    }

    /**
     * Adds a new qubit, initialized into the off state, to the circuit.
     * @returns {!int} The qubit's handle, used when specifying operation targets.
     */
    addOffQubit() {
        let id = this._nextId();
        this.qubitMap.set(id, new StabilizerQubit(
            new ObservableProduct(new Set(['q' + id])),
            new ObservableProduct()));
        return id;
    }

    /**
     * Adds a new qubit, in an unknown state, to the circuit.
     * @returns {!int} The qubit's handle, used when specifying operation targets.
     */
    addUnknownQubit() {
        let id = this._nextId();
        this.qubitMap.set(id, new StabilizerQubit(
            new ObservableProduct(new Set(['x' + id])),
            new ObservableProduct(new Set(['z' + id]))));
        return id;
    }

    /**
     * Discards a qubit from the circuit.
     * @param {!int} index The handle of the qubit to drop.
     */
    dropQubit(index) {
        this.measure(index);
        this.qubitMap.delete(index);
    }

    /**
     * @param {!int} index
     * @param {!function(!StabilizerQubit): !StabilizerQubit} action
     * @private
     */
    _do(index, action) {
        let q = this.qubitMap.get(index);
        if (q === undefined) {
            throw new DetailedError('Bad qubit index.', {index});
        }
        this.qubitMap.set(index, action(q));
    }

    /**
     * @param {!int} index1
     * @param {!int} index2
     * @param {!function(!StabilizerQubit, !StabilizerQubit): !Array.<!StabilizerQubit>} action
     * @private
     */
    _do2(index1, index2, action) {
        let a = this.qubitMap.get(index1);
        let b = this.qubitMap.get(index2);
        if (a === undefined || b === undefined || a === b) {
            throw new DetailedError('Bad qubit index.', {index1, index2});
        }
        let [c, d] = action(a, b);
        this.qubitMap.set(index1, c);
        this.qubitMap.set(index2, d);
    }

    x(index) {
        this._do(index, e => e.inline_x());
    }

    s(index) {
        this._do(index, e => e.inline_sqrtZ());
    }

    z(index) {
        this._do(index, e => e.inline_z());
    }

    h(index) {
        this._do(index, e => e.inline_h());
    }

    cz(index1, index2) {
        this._do2(index1, index2, (a, b) => a.inline_cz(b));
    }

    cnot(controlIndex, targetIndex) {
        this._do2(controlIndex, targetIndex, (a, b) => a.inline_cnot(b));
    }

    xnot(index1, index2) {
        this._do2(index1, index2, (a, b) => a.inline_xnot(b));
    }

    /**
     * @param {!Array.<!ObservableProduct>} targets
     * @param {!Array.<!ObservableProduct>} collaterals
     * @returns {!boolean}
     */
    measureObservable(targets, collaterals) {
        let p = ObservableProduct.product(targets);

        // Don't bother updating state if measurement result is predetermined.
        if (p.ids.size === 0) {
            return p.sign === -1;
        }

        // CNOT-ing the target observables into an ancilla has back-action on the target observables'
        // anti-commuting partners.
        let kickback = 'm' + this._nextId();
        for (let e of collaterals) {
            e.ids.add(kickback);
        }

        // Use measurement result to eliminate an id from the system.
        let m = new MeasurementResult(p, Math.random() < 0.5 ? -1 : +1);
        for (let q of this.qubitMap.values()) {
            q.inline_rewriteWithMeasurementResult(m);
        }
        return m.result === -1;
    }

    /**
     * @param {!int} index
     * @param {!boolean} reset
     * @returns {!boolean}
     */
    measure(index, reset=false) {
        let q = this.qubitMap.get(index);
        if (q === undefined) {
            throw new DetailedError('Bad qubit index.', {index});
        }

        let {new_state: s, result: m} = q.measureZ('m' + this._nextId());
        this.qubitMap.set(index, s);
        if (m.eliminatedId !== undefined) {
            for (let q of this.qubitMap.values()) {
                q.inline_rewriteWithMeasurementResult(m);
            }
        }
        if (reset && m.result === -1) {
            this.x(index);
        }
        return m.result === -1;
    }
}

export {StabilizerCircuitState};
