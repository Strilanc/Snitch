import {CARDINALS} from 'src/sim/Util.js'
import {DetailedError} from 'src/base/DetailedError.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'
import {seq} from "src/base/Seq.js";
import {squaredDistanceFromLine, makeGrid, cloneGrid} from 'src/sim/Util.js'
import {SurfaceCodeLayout} from "src/sim/SurfaceCodeLayout.js";
import {Axis, AXES, Z_AXIS, X_AXIS} from "src/sim/Util.js";


/**
 * @param {!SurfaceCode} surface
 * @param {!Axis} axis
 * @param {!boolean} result
 * @yields {![!int, !int]}
 * @private
 */
function* _checkQubitsWithResult(surface, axis, result) {
    for (let [i, j] of surface.layout.points) {
        if ((surface.last_result[i][j] !== surface.expected_result[i][j]) === result &&
                surface.layout.isCheckQubit(i, j, axis)) {
            yield [i, j];
        }
    }
}

class SurfaceCode {
    constructor(width, height) {
        this.layout = new SurfaceCodeLayout(width, height);
        this.state = new StabilizerCircuitState();
        this.xFlips = makeGrid(width, height, () => false);
        this.zFlips = makeGrid(width, height, () => false);
        this.last_result = makeGrid(width, height, () => false);
        this.expected_result = makeGrid(width, height, () => false);
        this.qubits = makeGrid(width, height,
            (i, j) => this.layout.isDataQubit(i, j) ? this.state.addOffQubit() : undefined);
    }

    clone() {
        let r = new SurfaceCode(0, 0);
        r.layout = this.layout.clone();
        r.state = this.state.clone();
        r.xFlips = cloneGrid(this.xFlips);
        r.zFlips = cloneGrid(this.zFlips);
        r.last_result = cloneGrid(this.last_result);
        r.expected_result = cloneGrid(this.expected_result);
        r.qubits = cloneGrid(this.qubits);
        return r;
    }

    /**
     * @param {!Axis} axis
     * @returns {!Array.<!Array.<!boolean>>}
     */
    xzFlips(axis) {
        return axis.isX() ? this.xFlips : this.zFlips;
    }

    /**
     * @param {!Axis} axis
     * @param {!boolean} result
     * @returns {!Iterable.<![!int, !int]>}
     */
    checkQubitsWithResult(axis, result) {
        return _checkQubitsWithResult(this, axis, result);
    }

    /**
     * @param {!number} x
     * @param {!number} y
     * @param {!Axis} axis
     * @returns {[!int, !int]}
     */
    nearestCheckQubitCoord(x, y, axis) {
        let i = Math.round(x);
        let j = Math.round(y);
        if (this.layout.colCheckType(i) !== axis) {
            i -= 1;
        }
        if (this.layout.rowCheckType(j) !== axis) {
            j -= 1;
        }
        return [i, j];
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!Axis} axis
     * @returns {!boolean}
     */
    squareMeasure(i, j, axis) {
        let neighborXs = [];
        let neighborZs = [];
        for (let [i2, j2] of this.layout.neighbors(i, j)) {
            let q = this.state.qubitMap.get(this.qubits[i2][j2]);
            neighborXs.push(q.obsX);
            neighborZs.push(q.obsZ);
        }

        if (axis.isX()) {
            return this.state.measureObservable(neighborXs, neighborZs);
        }
        return this.state.measureObservable(neighborZs, neighborXs);
    }

    measure(i, j) {
        this.last_result[i][j] = this.state.measure(this.qubits[i][j], true);
        return this.last_result[i][j];
    }

    shouldBeHole(i, j, holeOverlayFunc = () => false) {
        if (!this.layout.isInBounds(i, j)) {
            return {
                shouldBeHole: undefined,
                hasX: undefined,
                hasZ: undefined
            };
        }
        if (this.layout.isCheckQubit(i, j)) {
            return {
                shouldBeHole: this.layout.neighbors(i, j).length === 0 ? true : undefined,
                hasX: false,
                hasZ: false,
            };
        }

        let hasX = false;
        let hasZ = false;
        for (let [i2, j2] of this.layout.neighbors(i, j)) {
            if (!holeOverlayFunc(i2, j2)) {
                hasX = hasX || this.layout.isXCheckQubit(i2, j2);
                hasZ = hasZ || this.layout.isZCheckQubit(i2, j2);
            }
        }
        return {shouldBeHole: !hasX || !hasZ, hasX, hasZ};
    }

    updateDataHoleBasedOnNeighbors(i, j) {
        let {shouldBeHole, hasX} = this.shouldBeHole(i, j);

        if (shouldBeHole === undefined || this.layout.holes[i][j] === shouldBeHole) {
            return;
        }

        this.layout.holes[i][j] = shouldBeHole;
        if (this.layout.isDataQubit(i, j, true)) {
            if (shouldBeHole) {
                if (hasX) {
                    this.state.h(this.qubits[i][j]);
                }
                let m = this.measure(i, j);
                if (m) {
                    for (let [i2, j2] of this.layout.neighbors(i, j)) {
                        this.expected_result[i2][j2] = !this.expected_result[i2][j2];
                    }
                }
            } else {
                for (let [i2, j2] of this.layout.neighbors(i, j)) {
                    let axis = this.layout.rowCheckType(i2);
                    let m = this.squareMeasure(i2, j2, axis);
                    if (m !== this.expected_result[i2][j2]) {
                        this.doXZ(i, j, axis.opposite(), true);
                    }
                }
            }
            this.xFlips[i][j] = false;
            this.zFlips[i][j] = false;
        }
    }


    cycle() {
        for (let i = 0; i < this.layout.width; i++) {
            for (let j = 0; j < this.layout.height; j++) {
                if (this.layout.isXCheckQubit(i, j)) {
                    this.last_result[i][j] = this.squareMeasure(i, j, X_AXIS);
                } else if (this.layout.isZCheckQubit(i, j)) {
                    this.last_result[i][j] = this.squareMeasure(i, j, Z_AXIS);
                }
            }
        }
    }

    error(p = 0.0001) {
        for (let [i, j] of this.layout.dataPoints()) {
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
        for (let i = 0; i < this.layout.width; i += 2) {
            let b = false;
            for (let j = 0; j < this.layout.height; j += 2) {
                b ^= this.last_result[i][j] !== this.expected_result[i][j];
                if (b && j < this.layout.height - 1) {
                    this.state.x(this.qubits[i][j + 1]);
                }
            }
        }

        let max_i = (this.layout.width - (this.layout.width % 1)) - 1;
        for (let j = 1; j < this.layout.height; j += 2) {
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
        let grid = makeGrid(this.layout.width, this.layout.height, () => undefined);
        let queue = points.map(e => [e, e]);

        let clear = pt => {
            for (let [i, j] of this.layout.points) {
                if (grid[i][j] === pt) {
                    grid[i][j] = undefined;
                }
            }
            queue = queue.filter(e => e[1] !== pt);
        };

        while (queue.length > 0) {
            let [[x, y], src] = queue[0];
            queue.splice(0, 1);

            if (this.layout.isHole(x, y)) {
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
                for (let [di, dj] of CARDINALS) {
                    if (!this.layout.isHole(x + di, y + dj)) {
                        queue.push([[x + 2*di, y + 2*dj], src]);
                    }
                }
            }
        }
        return pairs;
    }

    clean_areas() {
        for (let axis of AXES) {
            let flips = this.xzFlips(axis.opposite());

            let areas = new Map();
            let areaVals = [];
            let reps = [];
            for (let pt of this.layout.points) {
                let queue = [pt];
                let area = [];
                let hitOppositeTypeSide = false;
                while (queue.length > 0) {
                    let [i, j] = queue.pop();
                    if (axis.isZ() ? (i < 0 || j < 0) : (i >= this.layout.width || j >= this.layout.height)) {
                        hitOppositeTypeSide = true;
                    }
                    let k = j * this.layout.width + i;
                    if (areas.has(k) ||
                            this.layout.isHole(i, j) ||
                            flips[i][j] ||
                            this.layout.isCheckQubit(i, j, axis)) {
                        continue;
                    }
                    areas.set(k, areaVals.length);
                    area.push([i, j]);
                    for (let [di, dj] of CARDINALS) {
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
                        if (!this.layout.isDataQubit(i, j)) {
                            let n = !this.layout.neighbors(i, j).every(([i2, j2]) => !this.xzFlips(axis.opposite())[i2][j2]);
                            let m = Math.max(Infinity,
                                ...this.layout.neighbors(i, j).
                                    filter(([i2, j2]) => area.length - 1 !== areas.get(j2*this.layout.width + i2)).
                                    map(([i2, j2]) => areaVals[areas.get(j2*this.layout.width + i2)]));
                            if (m <= area.length) {
                                continue;
                            }
                            let d = Math.min(i, j, this.layout.width - i - 1, this.layout.height - j - 1);
                            if ((n && !best_n) || (n === best_n && d > best_d)) {
                                best_i = i;
                                best_j = j;
                                best_d = d;
                                best_n = n;
                            }
                        }
                    }
                    if (best_i !== undefined && this.layout.isCheckQubit(best_i, best_j, axis.opposite())) {
                        reps.push([best_i, best_j]);
                    }
                }
            }

            for (let [i, j] of reps) {
                for (let [di, dj] of CARDINALS) {
                    let i2 = i + di;
                    let j2 = j + dj;
                    if (this.layout.isDataQubit(i2, j2)) {
                        flips[i2][j2] ^= true;
                    }
                }
            }
        }
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!Axis} axis
     * @param {!boolean=} doNotMarkFlip
     */
    doXZ(i, j, axis, doNotMarkFlip=false) {
        if (!this.layout.isDataQubit(i, j)) {
            return;
        }
        if (axis.isX()) {
            this.state.x(this.qubits[i][j]);
        } else {
            this.state.z(this.qubits[i][j]);
        }
        if (!doNotMarkFlip) {
            let flips = this.xzFlips(axis);
            flips[i][j] = !flips[i][j];
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
        let dirs = makeGrid(this.layout.width + 2, this.layout.height + 2, () => undefined);
        while (queue.length > 0) {
            let [i, j, dir] = queue[0];
            queue.splice(0, 1);
            if (!this.layout.isInBounds(i, j, 1) || dirs[i+1][j+1] !== undefined) {
                continue;
            }
            dirs[i+1][j+1] = dir;
            if (i === x2 && j === y2) {
                break;
            }

            let pts = seq(CARDINALS).
                sortedBy(([di, dj]) => squaredDistanceFromLine(i + di*2, j + dj*2, x1, y1, x2, y2)).
                toArray();
            for (let [di, dj] of pts) {
                if (this.layout.isDataQubit(i + di, j + dj, ignoreHoles) || this.layout.isHole(i, j)) {
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
        let axis = Axis.xz(xz);
        if (!this.layout.isDataQubit(i, j, true, true)) {
            throw new DetailedError('Not an error route', {i, j, axis});
        }
        let vertical = this.layout.colCheckType(i) === axis;
        return vertical ? [0, 1] : [1, 0];
    }

    /**
     * @param {!int} x1
     * @param {!int} y1
     * @param {!int} x2
     * @param {!int} y2
     * @param {!Axis} axis
     */
    chain(x1, y1, x2, y2, axis) {
        for (let [i, j] of this.pathAlongCheckQubits(x1, y1, x2, y2, false)) {
            if (!this.layout.isHole(i, j)) {
                this.doXZ(i, j, axis);
            }
        }
    }

    correct() {
        for (let axis of AXES) {
            let points = [];
            for (let [i, j] of this.layout.checkQubits(axis)) {
                if (this.last_result[i][j] !== this.expected_result[i][j]) {
                    points.push([i, j]);
                }
            }

            let pairs = this.pairs(points);
            for (let [[x1, y1], [x2, y2]] of pairs) {
                this.chain(x1, y1, x2, y2, axis);
            }
        }
    }

    clearFlips() {
        this.xFlips = makeGrid(this.layout.width, this.layout.height, () => false);
        this.zFlips = makeGrid(this.layout.width, this.layout.height, () => false);
    }
}

export {SurfaceCode}
