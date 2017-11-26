import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'


class SurfaceCode {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.state = new StabilizerCircuitState();

        this.qubits = [];
        this.last_result = [];
        this.target = this.state.add_off_qubit();
        for (let i = 0; i < width; i++) {
            let r = [];
            let m = [];
            for (let j = 0; j < height; j++) {
                if ((i & 1) !== (j & 1)) {
                    r.push(this.state.add_off_qubit());
                } else {
                    r.push(this.target);
                }
                m.push(undefined);
            }
            this.qubits.push(r);
            this.last_result.push(m);
        }
    }

    neighbors(i, j) {
        let result = [];
        for (let [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            let i2 = i + di;
            let j2 = j + dj;
            if (i2 >= 0 && i2 < this.width && j2 >= 0 && j2 < this.height) {
                result.push([i2, j2]);
            }
        }
        return result;
    }

    square_measure(i, j, h) {
        let t = this.qubits[i][j];
        this.state.h(t);
        for (let [x, y] of this.neighbors(i, j)) {
            let c = this.qubits[x][y];
            if (h) {
                this.state.h(c);
            }
            this.state.cz(c, t);
            if (h) {
                this.state.h(c);
            }
        }
        this.state.h(t);
        let v = this.state.measure(t, true);
        return v;
    }

    cycle() {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if ((i & 1) === (j & 1)) {
                    this.last_result[i][j] = this.square_measure(i, j, (i & 1) === 1);
                }
            }
        }
    }

    error(p = 0.01) {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (Math.random() < p) {
                    if (Math.random() < 0.5) {
                        this.state.x(this.qubits[i][j]);
                    }
                    if (Math.random() < 0.5) {
                        this.state.z(this.qubits[i][j]);
                    }
                }
            }
        }
    }

    zero() {
        for (let i = 0; i < this.width; i += 2) {
            let b = false;
            for (let j = 0; j < this.height; j += 2) {
                b ^= this.last_result[i][j] === true;
                if (b && j < this.height - 1) {
                    this.state.x(this.qubits[i][j + 1]);
                }
            }
        }

        let max_i = (this.width - (this.width % 1)) - 1;
        for (let j = 1; j < this.height; j += 2) {
            let b = false;
            for (let i = max_i; i >= 0; i -= 2) {
                b ^= this.last_result[i][j] === true;
                if (b && i > 0) {
                    this.state.z(this.qubits[i - 1][j]);
                }
            }
        }
    }
}

export {SurfaceCode}
