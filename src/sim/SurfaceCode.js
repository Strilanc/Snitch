import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'


function makeGrid(width, height, generatorFunc) {
    let grid = [];
    for (let i = 0; i < width; i++) {
        let row = [];
        for (let j = 0; j < height; j++) {
            row.push(generatorFunc(i, j));
        }
        grid.push(row);
    }
    return grid;
}

function* _dataPoints(surface) {
    for (let pt of surface.points) {
        if (surface.isDataQubit(pt[0], pt[1])) {
            yield pt;
        }
    }
}

function* _holes(surface, pad=1) {
    for (let i = -pad; i < surface.width+pad; i++) {
        for (let j = -pad; j < surface.height+pad; j++) {
            if (surface.isHole(i, j)) {
                yield [i, j];
            }
        }
    }
}

class SurfaceCode {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.state = new StabilizerCircuitState();
        this.holes = makeGrid(width, height, () => false);
        this.xFlips = makeGrid(width, height, () => false);
        this.zFlips = makeGrid(width, height, () => false);
        this.last_result = makeGrid(width, height, () => undefined);
        this.target = this.state.add_off_qubit();
        this.qubits = makeGrid(width, height,
            (i, j) => this.isDataQubit(i, j) ? this.state.add_off_qubit(): this.target);

        this.points = [];
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                this.points.push([i, j]);
            }
        }
    }

    xzFlips(xz) {
        return xz ? this.xFlips : this.zFlips;
    }

    isXCheckCol(col) {
        return (col & 1) === 1;
    }

    isZCheckCol(col) {
        return (col & 1) === 0;
    }

    isXCheckRow(row) {
        return (row & 1) === 1;
    }

    isZCheckRow(row) {
        return (row & 1) === 0;
    }

    dataPoints() {
        return _dataPoints(this);
    }

    static cardinals() {
        return [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
        ];
    }

    holePoints() {
        return _holes(this);
    }

    neighbors(i, j) {
        let result = [];
        for (let [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            let i2 = i + di;
            let j2 = j + dj;
            if (i2 >= 0 && i2 < this.width && j2 >= 0 && j2 < this.height && !this.isHole(i2, j2)) {
                result.push([i2, j2]);
            }
        }
        return result;
    }

    square_measure(i, j, h) {
        let t = this.qubits[i][j];
        for (let [x, y] of this.neighbors(i, j)) {
            let c = this.qubits[x][y];
            if (h) {
                this.state.xnot(c, t);
            } else {
                this.state.cnot(c, t);
            }
        }
        return this.state.measure(t, true);
    }

    measure(i, j) {
        this.last_result[i][j] = this.state.measure(this.qubits[i][j], true);
        return this.last_result[i][j];
    }

    isHole(i, j) {
        return !this.isInBounds(i, j) || this.holes[i][j];
    }

    isInBounds(i, j, padding=0) {
        return i >= -padding && j >= -padding && i < this.width+padding && j < this.height + padding;
    }

    //noinspection JSMethodCanBeStatic
    isZCheckQubit(i, j, ignoreHole=false) {
        return (ignoreHole || !this.isHole(i, j)) && (i & 1) === 0 && (j & 1) === 0;
    }

    borderType(i, j, di, dj) {
        let i2 = i + di;
        let j2 = j + dj;
        let h1 = this.isHole(i, j);
        let h2 = this.isHole(i2, j2);
        if (h1 === h2) {
            return undefined;
        }
        if (h2) {
            [i, j, i2, j2] = [i2, j2, i, j];
        }
        let z1 = this.isZCheckQubit(i, j, true);
        let x2 = this.isXCheckQubit(i2, j2, true);
        return z1 || x2 ? 'Z' : 'X';
    }

    //noinspection JSMethodCanBeStatic
    isXCheckQubit(i, j, ignoreHole=false) {
        return (ignoreHole || !this.isHole(i, j)) && (i & 1) === 1 && (j & 1) === 1;
    }

    //noinspection JSMethodCanBeStatic
    isDataQubit(i, j) {
        return !this.isHole(i, j) && (i & 1) !== (j & 1);
    }

    cycle() {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.isXCheckQubit(i, j)) {
                    this.last_result[i][j] = this.square_measure(i, j, true);
                } else if (this.isZCheckQubit(i, j)) {
                    this.last_result[i][j] = this.square_measure(i, j, false);
                }
            }
        }
    }

    error(p = 0.0001) {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.isDataQubit(i, j) && Math.random() < p) {
                    if (Math.random() < 0.5) {
                        this.state.x(this.qubits[i][j]);
                        this.xFlips[i][j] ^= true;
                    }
                    if (Math.random() < 0.5) {
                        this.state.z(this.qubits[i][j]);
                        this.zFlips[i][j] ^= true;
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

    pairs(points) {
        let pairs = [];
        let grid = makeGrid(this.width, this.height, () => undefined);
        let queue = points.map(e => [e, e]);

        let clear = pt => {
            for (let i = 0; i < this.width; i++) {
                for (let j = 0; j < this.height; j++) {
                    if (grid[i][j] === pt) {
                        grid[i][j] = undefined;
                    }
                }
            }
            queue = queue.filter(e => e[1] !== pt);
        };

        while (queue.length > 0) {
            let [[x, y], src] = queue[0];
            queue.splice(0, 1);

            if (this.isHole(x, y)) {
                clear(src);
                pairs.push([src, [x, y]]);
                continue;
            }

            let dst = grid[x][y];
            if (src === dst) {
                continue;
            }
            if (dst !== undefined) {
                clear(src);
                clear(dst);
                pairs.push([src, dst])
            } else {
                grid[x][y] = src;
                if (!this.isHole(x + 1, y)) {
                    queue.push([[x + 2, y], src]);
                }
                if (!this.isHole(x - 1, y)) {
                    queue.push([[x - 2, y], src]);
                }
                if (!this.isHole(x, y - 1)) {
                    queue.push([[x, y - 2], src]);
                }
                if (!this.isHole(x, y + 1)) {
                    queue.push([[x, y + 2], src]);
                }
            }
        }
        return pairs;
    }

    clean_areas() {
        for (let b of [false, true]) {
            let areas = new Map();
            let areaVals = [];
            let reps = [];
            for (let pt of this.points) {
                let queue = [pt];
                let area = [];
                let hitOppositeTypeSide = false;
                while (queue.length > 0) {
                    let [i, j] = queue.pop();
                    if (b ? (i < 0 || j < 0) : (i >= this.width || j >= this.height)) {
                        hitOppositeTypeSide = true;
                    }
                    let k = j * this.width + i;
                    if (areas.has(k) || this.isHole(i, j) || (b ? this.xFlips[i][j] : this.zFlips[i][j]) || (b ? this.isZCheckQubit(i, j) : this.isXCheckQubit(i, j))) {
                        continue;
                    }
                    areas.set(k, areaVals.length);
                    area.push([i, j]);

                    queue.push([i + 1, j]);
                    queue.push([i - 1, j]);
                    queue.push([i, j - 1]);
                    queue.push([i, j + 1]);
                }

                if (hitOppositeTypeSide) {
                    areaVals.push(Infinity);
                } else if (area.length > 0) {
                    areaVals.push(area.length);
                    let best_i = undefined;
                    let best_j = undefined;
                    let best_d = -Infinity;
                    let best_n = false;
                    for (let [i, j] of area) {
                        if (!this.isDataQubit(i, j)) {
                            let n = !this.neighbors(i, j).every(([i2, j2]) => !(b ? this.xFlips : this.zFlips)[i2][j2]);
                            let m = Math.max(Infinity,
                                ...this.neighbors(i, j).
                                    filter(([i2, j2]) => area.length - 1 !== areas.get(j2*this.width + i2)).
                                    map(([i2, j2]) => areaVals[areas.get(j2*this.width + i2)]));
                            if (m <= area.length) {
                                continue;
                            }
                            let d = Math.min(i, j, this.width - i - 1, this.height - j - 1);
                            if ((n && !best_n) || (n === best_n && d > best_d)) {
                                best_i = i;
                                best_j = j;
                                best_d = d;
                                best_n = n;
                            }
                        }
                    }
                    if (best_i !== undefined) {
                        reps.push([best_i, best_j]);
                    }
                }
            }

            for (let [i, j] of reps) {
                if (b ? this.isXCheckQubit(i, j) : this.isZCheckQubit(i, j)) {
                    for (let [di, dj] of [[-1, 0], [+1, 0], [0, -1], [0, +1]]) {
                        let i2 = i + di;
                        let j2 = j + dj;
                        if (this.isDataQubit(i2, j2)) {
                            if (b) {
                                this.xFlips[i2][j2] ^= true;
                            } else {
                                this.zFlips[i2][j2] ^= true;
                            }
                        }
                    }
                }
            }
        }
    }

    chain(x1, y1, x2, y2, isX) {
        let flip = isX ?
            (x, y) => {
                this.state.x(this.qubits[x][y]);
                this.xFlips[x][y] ^= true;
            } :
            (x, y) => {
                this.state.z(this.qubits[x][y]);
                this.zFlips[x][y] ^= true;
            };

        while (x1 < x2) {
            flip(x1 + 1, y1);
            x1 += 2;
        }
        while (x1 > x2) {
            flip(x1 - 1, y1);
            x1 -= 2;
        }
        while (y1 < y2) {
            flip(x1, y1 + 1);
            y1 += 2;
        }
        while (y1 > y2) {
            flip(x1, y1 - 1);
            y1 -= 2;
        }
    }

    correct() {
        let points = [];
        let points2 = [];
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.last_result[i][j] === true) {
                    if (this.isZCheckQubit(i, j)) {
                        points.push([i, j]);
                    } else if (this.isXCheckQubit(i, j)) {
                        points2.push([i, j]);
                    }
                }
            }
        }

        for (let [[x1, y1], [x2, y2]] of this.pairs(points)) {
            this.chain(x1, y1, x2, y2, true);
        }

        for (let [[x1, y1], [x2, y2]] of this.pairs(points2)) {
            this.chain(x1, y1, x2, y2, false);
        }
    }

    clearFlips() {
        this.xFlips = makeGrid(this.width, this.height, () => false);
        this.zFlips = makeGrid(this.width, this.height, () => false);
    }
}

export {SurfaceCode}
