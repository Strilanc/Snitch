import {DetailedError} from 'src/base/DetailedError.js'
import {ObservableProduct} from 'src/sim/ObservableProduct.js'
import {MeasurementResult} from 'src/sim/MeasurementResult.js'
import {StabilizerQubit} from 'src/sim/StabilizerQubit.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'
import {seq} from "src/base/Seq.js";


/**
 * @param {!number} x
 * @param {!number} y
 * @param {!number} x1
 * @param {!number} y1
 * @param {!number} x2
 * @param {!number} y2
 * @returns {!number}
 */
function squaredDistanceFromLine(x, y, x1, y1, x2, y2) {
    let ax = x - x1;
    let ay = y - y1;
    let bx = x2 - x1;
    let by = y2 - y1;
    let s = (ax*bx + ay*by) / (bx*bx + by*by);
    ax -= s*bx;
    ay -= s*by;
    return ax*ax + ay*ay;
}

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

function cloneGrid(grid) {
    return grid.map(row => row.map(r => r));
}

function* _dataPoints(surface, ignoreHoles) {
    for (let pt of surface.points) {
        if (surface.isDataQubit(pt[0], pt[1], ignoreHoles)) {
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

function* _checkQubits(surface, xz) {
    for (let pt of surface.points) {
        if (surface.isCheckQubit(pt[0], pt[1], xz)) {
            yield pt;
        }
    }
}

function* _checkQubitsWithResult(surface, xz, result) {
    for (let [i, j] of surface.points) {
        if ((surface.last_result[i][j] !== surface.expected_result[i][j]) === result && surface.isCheckQubit(i, j, xz)) {
            yield [i, j];
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
        this.last_result = makeGrid(width, height, () => false);
        this.expected_result = makeGrid(width, height, () => false);
        this.qubits = makeGrid(width, height,
            (i, j) => this.isDataQubit(i, j) ? this.state.addOffQubit() : undefined);

        this.points = [];
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                this.points.push([i, j]);
            }
        }
    }

    clone() {
        let r = new SurfaceCode(this.width, this.height);
        r.state = this.state.clone();
        r.holes = cloneGrid(this.holes);
        r.xFlips = cloneGrid(this.xFlips);
        r.zFlips = cloneGrid(this.zFlips);
        r.last_result = cloneGrid(this.last_result);
        r.expected_result = cloneGrid(this.expected_result);
        r.qubits = cloneGrid(this.qubits);
        r.points = this.points.map(e => e);
        return r;
    }


    xzFlips(xz) {
        return xz ? this.xFlips : this.zFlips;
    }

    checkQubits(xz) {
        return _checkQubits(this, xz);
    }

    checkQubitsWithResult(xz, result) {
        return _checkQubitsWithResult(this, xz, result);
    }

    isXCheckCol(col) {
        return (col & 1) === 1;
    }

    isCheckCol(col, xz) {
        return (col & 1) === (xz ? 0 : 1);
    }

    isCheckRow(row, xz) {
        return (row & 1) === (xz ? 0 : 1);
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

    dataPoints(ignoreHoles=false) {
        return _dataPoints(this, ignoreHoles);
    }

    static cardinals() {
        return [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
        ];
    }

    holePoints(pad=1) {
        return _holes(this, pad);
    }

    neighbors(i, j, ignoreHoles=false) {
        let result = [];
        for (let [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            let i2 = i + di;
            let j2 = j + dj;
            if (i2 >= 0 && i2 < this.width && j2 >= 0 && j2 < this.height && (ignoreHoles || !this.isHole(i2, j2))) {
                result.push([i2, j2]);
            }
        }
        return result;
    }

    /**
     * @param {!number} x
     * @param {!number} y
     * @param {!boolean} xz
     * @returns {[!int, !int]}
     */
    nearestCheckQubitCoord(x, y, xz) {
        let i = Math.round(x);
        let j = Math.round(y);
        if (!this.isCheckCol(i, xz)) {
            i -= 1;
        }
        if (!this.isCheckRow(j, xz)) {
            j -= 1;
        }
        return [i, j];
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} zx
     * @returns {!boolean}
     */
    squareMeasure(i, j, zx) {
        let neighborXs = [];
        let neighborZs = [];
        for (let [i2, j2] of this.neighbors(i, j)) {
            let q = this.state.qubitMap.get(this.qubits[i2][j2]);
            neighborXs.push(q.obsX);
            neighborZs.push(q.obsZ);
        }

        if (zx) {
            return this.state.measureObservable(neighborXs, neighborZs);
        }
        return this.state.measureObservable(neighborZs, neighborXs);
    }

    measure(i, j) {
        this.last_result[i][j] = this.state.measure(this.qubits[i][j], true);
        return this.last_result[i][j];
    }

    holeFloodFill(x, y) {
        let q = [[x, y]];
        let seen = makeGrid(this.width, this.height, () => false);
        let result = [];
        while (q.length > 0) {
            let [i, j] = q.pop();
            if (!this.isInBounds(i, j) || !this.isHole(i, j) || seen[i][j]) {
                continue;
            }
            seen[i][j] = true;
            for (let pt of this.neighbors(i, j, true)) {
                q.push(pt)
            }
            result.push([i, j]);
        }
        return result;
    }

    shouldBeHole(i, j, holeOverlayFunc = () => false) {
        if (!this.isInBounds(i, j)) {
            return {
                shouldBeHole: undefined,
                hasX: undefined,
                hasZ: undefined
            };
        }
        if (this.isCheckQubit(i, j)) {
            return {
                shouldBeHole: this.neighbors(i, j).length === 0 ? true : undefined,
                hasX: false,
                hasZ: false,
            };
        }

        let hasX = false;
        let hasZ = false;
        for (let [i2, j2] of this.neighbors(i, j)) {
            if (!holeOverlayFunc(i2, j2)) {
                hasX = hasX || this.isXCheckQubit(i2, j2);
                hasZ = hasZ || this.isZCheckQubit(i2, j2);
            }
        }
        return {shouldBeHole: !hasX || !hasZ, hasX, hasZ};
    }

    updateDataHoleBasedOnNeighbors(i, j) {
        let {shouldBeHole, hasX} = this.shouldBeHole(i, j);

        if (shouldBeHole === undefined || this.holes[i][j] === shouldBeHole) {
            return;
        }

        this.holes[i][j] = shouldBeHole;
        if (this.isDataQubit(i, j, true)) {
            if (shouldBeHole) {
                if (hasX) {
                    this.state.h(this.qubits[i][j]);
                }
                let m = this.measure(i, j);
                if (m) {
                    for (let [i2, j2] of this.neighbors(i, j)) {
                        this.expected_result[i2][j2] = !this.expected_result[i2][j2];
                    }
                }
            } else {
                for (let [i2, j2] of this.neighbors(i, j)) {
                    let zx = this.isXCheckRow(i2);
                    let m = this.squareMeasure(i2, j2, zx);
                    if (m !== this.expected_result[i2][j2]) {
                        this.doXZ(i, j, !zx, true);
                    }
                }
            }
            this.xFlips[i][j] = false;
            this.zFlips[i][j] = false;
        }
    }


    isHole(i, j) {
        return !this.isInBounds(i, j) || this.holes[i][j];
    }

    isInBounds(i, j, padding=0) {
        return i >= -padding && j >= -padding && i < this.width+padding && j < this.height + padding;
    }

    //noinspection JSMethodCanBeStatic
    isZCheckQubit(i, j, ignoreHole=false, ignoreBounds=false) {
        return (ignoreHole || !this.isHole(i, j)) && (ignoreBounds || this.isInBounds(i, j)) && (i & 1) === 0 && (j & 1) === 0;
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
        let z1 = this.isZCheckQubit(i, j, true, true);
        let x2 = this.isXCheckQubit(i2, j2, true, true);
        return z1 || x2 ? 'Z' : 'X';
    }

    //noinspection JSMethodCanBeStatic
    isXCheckQubit(i, j, ignoreHole=false, ignoreBounds=false) {
        return (ignoreHole || !this.isHole(i, j)) && (ignoreBounds || this.isInBounds(i, j)) && (i & 1) === 1 && (j & 1) === 1;
    }

    isCheckQubit(i, j, xz=undefined, ignoreHole=false) {
        if (xz === undefined) {
            return this.isXCheckQubit(i, j, ignoreHole) || this.isZCheckQubit(i, j, ignoreHole);
        }
        return xz ? this.isXCheckQubit(i, j, ignoreHole) : this.isZCheckQubit(i, j, ignoreHole);
    }

    //noinspection JSMethodCanBeStatic
    isDataQubit(i, j, ignoreHoles=false, ignoreBounds=false) {
        return (ignoreHoles || !this.isHole(i, j)) && (ignoreBounds || this.isInBounds(i, j)) && (i & 1) !== (j & 1);
    }

    cycle() {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.isXCheckQubit(i, j)) {
                    this.last_result[i][j] = this.squareMeasure(i, j, true);
                } else if (this.isZCheckQubit(i, j)) {
                    this.last_result[i][j] = this.squareMeasure(i, j, false);
                }
            }
        }
    }

    error(p = 0.0001) {
        for (let [i, j] of this.dataPoints()) {
            if (Math.random() < p) {
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

    zero() {
        for (let i = 0; i < this.width; i += 2) {
            let b = false;
            for (let j = 0; j < this.height; j += 2) {
                b ^= this.last_result[i][j] !== this.expected_result[i][j];
                if (b && j < this.height - 1) {
                    this.state.x(this.qubits[i][j + 1]);
                }
            }
        }

        let max_i = (this.width - (this.width % 1)) - 1;
        for (let j = 1; j < this.height; j += 2) {
            let b = false;
            for (let i = max_i; i >= 0; i -= 2) {
                b ^= this.last_result[i][j] !== this.expected_result[i][j];
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
            for (let [i, j] of this.points) {
                if (grid[i][j] === pt) {
                    grid[i][j] = undefined;
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
                for (let [di, dj] of SurfaceCode.cardinals()) {
                    if (!this.isHole(x + di, y + dj)) {
                        queue.push([[x + 2*di, y + 2*dj], src]);
                    }
                }
            }
        }
        return pairs;
    }

    clean_areas() {
        for (let xz of [false, true]) {
            let flips = this.xzFlips(xz);

            let areas = new Map();
            let areaVals = [];
            let reps = [];
            for (let pt of this.points) {
                let queue = [pt];
                let area = [];
                let hitOppositeTypeSide = false;
                while (queue.length > 0) {
                    let [i, j] = queue.pop();
                    if (xz ? (i < 0 || j < 0) : (i >= this.width || j >= this.height)) {
                        hitOppositeTypeSide = true;
                    }
                    let k = j * this.width + i;
                    if (areas.has(k) || this.isHole(i, j) || flips[i][j] || this.isCheckQubit(i, j, !xz)) {
                        continue;
                    }
                    areas.set(k, areaVals.length);
                    area.push([i, j]);
                    for (let [di, dj] of SurfaceCode.cardinals()) {
                        queue.push([i + di, j + dj]);
                    }
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
                            let n = !this.neighbors(i, j).every(([i2, j2]) => !(xz ? this.xFlips : this.zFlips)[i2][j2]);
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
                    if (best_i !== undefined && this.isCheckQubit(best_i, best_j, xz)) {
                        reps.push([best_i, best_j]);
                    }
                }
            }

            for (let [i, j] of reps) {
                for (let [di, dj] of SurfaceCode.cardinals()) {
                    let i2 = i + di;
                    let j2 = j + dj;
                    if (this.isDataQubit(i2, j2)) {
                        flips[i2][j2] ^= true;
                    }
                }
            }
        }
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} xz
     * @param {!boolean=} doNotMarkFlip
     */
    doXZ(i, j, xz, doNotMarkFlip=false) {
        if (!this.isDataQubit(i, j)) {
            return;
        }
        if (xz) {
            this.state.x(this.qubits[i][j]);
        } else {
            this.state.z(this.qubits[i][j]);
        }
        if (!doNotMarkFlip) {
            this.xzFlips(xz)[i][j] ^= true;
        }
    }

    /**
     * @param {!int} x1
     * @param {!int} y1
     * @param {!int} x2
     * @param {!int} y2
     * @param {!boolean} returnCheckQubitsAlongPathInsteadOfDataQubits
     * @param {!boolean} ignoreHoles
     * @returns {!Array.<!Array.<!int, !int>>}
     */
    pathAlongCheckQubits(x1, y1, x2, y2, returnCheckQubitsAlongPathInsteadOfDataQubits, ignoreHoles=false) {
        let queue = [[x1, y1, undefined]];
        let dirs = makeGrid(this.width + 2, this.height + 2, () => undefined);
        while (queue.length > 0) {
            let [i, j, dir] = queue[0];
            queue.splice(0, 1);
            if (!this.isInBounds(i, j, 1) || dirs[i+1][j+1] !== undefined) {
                continue;
            }
            dirs[i+1][j+1] = dir;
            if (i === x2 && j === y2) {
                break;
            }

            let pts = seq(SurfaceCode.cardinals()).
                sortedBy(([di, dj]) => squaredDistanceFromLine(i + di*2, j + dj*2, x1, y1, x2, y2)).
                toArray();
            for (let [di, dj] of pts) {
                if (this.isDataQubit(i + di, j + dj, ignoreHoles) || this.isHole(i, j)) {
                    queue.push([i + di*2, j + dj*2, [-di, -dj]]);
                }
            }
        }
        if (dirs[x2+1][y2+1] === undefined) {
            return [];
        }

        let result = [];
        let [i, j] = [x2, y2];
        while (i !== x1 || j !== y1) {
            let [di, dj] = dirs[i+1][j+1];
            if (returnCheckQubitsAlongPathInsteadOfDataQubits) {
                result.push([i, j]);
            } else {
                result.push([i + di, j + dj]);
            }
            i += di*2;
            j += dj*2;
        }
        if (returnCheckQubitsAlongPathInsteadOfDataQubits) {
            result.push([i, j]);
        }
        return result;
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} xz
     * @returns {!Array.<![!int, !int]>}
     */
    errorOrientation(i, j, xz) {
        if (!this.isDataQubit(i, j, true, true)) {
            throw new DetailedError('Not an error route', {i, j, xz});
        }
        let vertical = this.isXCheckCol(i) !== xz;
        return vertical ? [0, 1] : [1, 0];
    }

    chain(x1, y1, x2, y2, xz) {
        for (let [i, j] of this.pathAlongCheckQubits(x1, y1, x2, y2, false)) {
            if (!this.isHole(i, j)) {
                this.doXZ(i, j, xz);
            }
        }
    }

    correct() {
        for (let xz of [false, true]) {
            let points = [];
            for (let [i, j] of this.checkQubits(xz)) {
                if (this.last_result[i][j] !== this.expected_result[i][j]) {
                    points.push([i, j]);
                }
            }

            let pairs = this.pairs(points);
            for (let [[x1, y1], [x2, y2]] of pairs) {
                this.chain(x1, y1, x2, y2, !xz);
            }
        }
    }

    clearFlips() {
        this.xFlips = makeGrid(this.width, this.height, () => false);
        this.zFlips = makeGrid(this.width, this.height, () => false);
    }
}

export {SurfaceCode}
