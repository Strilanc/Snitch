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

/**
 * The state of a qubit in a stabilizer circuit, tracked by noting which observables its X and Z axis correspond to.
 */
class StabilizerQubit {
    /**
     * @param {!ObservableProduct} obsX
     * @param {!ObservableProduct} obsZ
     * @param {!int} signY
     */
    constructor(obsX, obsZ, signY = +1) {
        if (!(obsX instanceof ObservableProduct) ||
                !(obsZ instanceof ObservableProduct) ||
                (signY !== -1 && signY !== 1) ||
                (obsX.ids.size === 0 && obsZ.ids.size === 0)) {
            throw new DetailedError('Bad args.', {obsX, obsZ, signY});
        }
        this.obsX = obsX;
        this.obsZ = obsZ;
        this.signY = signY;
    }

    clone() {
        return new StabilizerQubit(this.obsX.clone(), this.obsZ.clone(), this.signY);
    }

    /**
     * The Y observable is implied by the X and Z observables, times a sign.
     * @returns {!ObservableProduct}
     */
    get obsY() {
        return this.obsX.times(this.obsZ).times(this.signY);
    }

    isEqualTo(other) {
        return (other instanceof StabilizerQubit &&
        this.obsX.isEqualTo(other.obsX) &&
        this.obsZ.isEqualTo(other.obsZ) &&
        this.signY === other.signY);
    }

    toString() {
        return `Q(X=${this.obsX}, Z=${this.obsZ}, Y=${this.signY === -1 ? '-' : ''}X*Z)`;
    }

    inline_x() {
        this.obsZ.sign *= -1;
        return this;
    }

    inline_y() {
        this.obsX.sign *= -1;
        this.obsZ.sign *= -1;
        return this;
    }

    inline_z() {
        this.obsX.sign *= -1;
        return this;
    }

    inline_h() {
        let z = this.obsZ;
        this.obsZ = this.obsX;
        this.obsX = z;
        this.signY *= -1;
        return this;
    }


    /**
     * Returns the result of applying a 90 degree right handed rotation around the X axis to the qubit.
     * @returns {!StabilizerQubit}
     */
    sqrtX() {
        return this.clone().inline_sqrtX();
    }

    /**
     * Returns the result of applying a 90 degree right handed rotation around the Y axis to the qubit.
     * @returns {!StabilizerQubit}
     */
    sqrtY() {
        return this.clone().inline_sqrtY();
    }

    /**
     * Returns the result of applying a 90 degree right handed rotation around the Z axis to the qubit.
     * @returns {!StabilizerQubit}
     */
    sqrtZ() {
        return this.clone().inline_sqrtZ();
    }

    /**
     * Returns the result of applying a controlled-Z operation to the pair of qubits.
     * @returns {!Array.<!StabilizerQubit>}
     */
    cz(other) {
        let q1 = this.clone();
        let q2 = other.clone();
        return q1.inline_cz(q2);
    }

    inline_sqrtX() {
        this.obsZ.times_inline(this.obsX);
        this.obsZ.sign *= this.signY;
        this.signY *= -1;
        return this;
    }


    inline_sqrtY() {
        let x = this.obsX;
        let z = this.obsZ;
        this.obsX = z;
        this.obsZ = x;
        this.obsZ.sign *= -1;
        this.signY *= -1;
        return this;
    }

    inline_sqrtZ() {
        this.obsX.times_inline(this.obsZ);
        this.obsX.sign *= -this.signY;
        this.signY *= -1;
        return this;
    }

    inline_cz(other) {
        this.obsX.times_inline(other.obsZ);
        other.obsX.times_inline(this.obsZ);
        return [this, other];
    }

    inline_xnot(other) {
        this.obsZ.times_inline(other.obsX);
        other.obsZ.times_inline(this.obsX);
        return [this, other];
    }

    inline_cnot(target) {
        this.obsX.times_inline(target.obsX);
        target.obsZ.times_inline(this.obsZ);
        return [this, target];
    }

    /**
     * Attempts to use the measurement result to eliminate a variable from the qubit's observables.
     * @param {!MeasurementResult} measurementResult
     * @returns {!StabilizerQubit}
     */
    rewriteWithMeasurementResult(measurementResult) {
        return new StabilizerQubit(
            measurementResult.rewriteObservableProduct(this.obsX),
            measurementResult.rewriteObservableProduct(this.obsZ),
            this.signY);
    }

    /**
     * Samples a possible measurement result and returns it along with the resulting state of the qubit.
     * @param {!string} new_x_id The new variable to use for the axis that anti-commutes with the measurement.
     * @returns {!{new_state: !StabilizerQubit, result: !MeasurementResult}}
     */
    measureZ(new_x_id) {
        let z = this.obsZ;
        if (z.ids.size === 0) {
            // Qubit has a constant Z value. Removing the measurement doesn't change the circuit.
            return {new_state: this, result: new MeasurementResult(z, z.sign)};
        }

        let result = new MeasurementResult(z, Math.random() < 0.5 ? -1 : +1);
        let new_state = new StabilizerQubit(
            new ObservableProduct(new Set([new_x_id])),
            new ObservableProduct(new Set(), result.result),
            +1);
        return {new_state, result}
    }
}

export {StabilizerQubit};
