import {CARDINALS} from 'src/sim/Util.js'
import {StabilizerCircuitState} from 'src/sim/StabilizerCircuitState.js'
import {makeGrid, cloneGrid} from 'src/sim/Util.js'
import {SurfaceCodeLayout} from "src/sim/SurfaceCodeLayout.js";
import {SurfaceCodeErrorOverlay} from "src/sim/SurfaceCodeErrorOverlay.js";
import {Axis, AXES, Z_AXIS, X_AXIS} from "src/sim/Util.js";


/**
 * @param {!SurfaceCode} surface
 * @param {!Axis} axis
 * @param {!boolean} result
 * @yields {![!int, !int]}
 * @private
 */
function* _checkQubitsWithResultVsExpected(surface, axis, result) {
    for (let [i, j] of surface.layout.points) {
        let errorIndicated = surface.last_result[i][j] !== surface.expected_result[i][j];
        if (errorIndicated === result && surface.layout.isCheckQubit(i, j, axis)) {
            yield [i, j];
        }
    }
}

class SurfaceCode {
    /**
     * @param {!int} width
     * @param {!int} height
     */
    constructor(width, height) {
        this.layout = new SurfaceCodeLayout(width, height);
        this.state = new StabilizerCircuitState();
        this.last_result = makeGrid(width, height, () => false);
        this.expected_result = makeGrid(width, height, () => false);
        this.qubits = makeGrid(width, height,
            (i, j) => this.layout.isDataQubit(i, j) ? this.state.addOffQubit() : undefined);
        this.errorOverlay = new SurfaceCodeErrorOverlay(this);
    }

    /**
     * @returns {!SurfaceCode}
     */
    clone() {
        let r = new SurfaceCode(0, 0);
        r.layout = this.layout.clone();
        r.state = this.state.clone();
        r.errorOverlay.xFlips = cloneGrid(this.errorOverlay.xFlips);
        r.errorOverlay.zFlips = cloneGrid(this.errorOverlay.zFlips);
        r.last_result = cloneGrid(this.last_result);
        r.expected_result = cloneGrid(this.expected_result);
        r.qubits = cloneGrid(this.qubits);
        return r;
    }

    /**
     * @param {!Axis} axis
     * @param {!boolean} result
     * @returns {!Iterable.<![!int, !int]>}
     */
    checkQubitsWithResultVsExpected(axis, result) {
        return _checkQubitsWithResultVsExpected(this, axis, result);
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
                        this.errorOverlay.flipQubit(i, j, axis.opposite());
                    }
                }
            }
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
                this.errorOverlay.flipQubitsAlongPath(x1, y1, x2, y2, axis.opposite());
            }
        }
    }

    extendHole(i, j) {
        if (!this.layout.isCheckQubit(i, j)) {
            return;
        }

        for (let [di, dj] of CARDINALS) {
            let i2 = i + di;
            let j2 = j + dj;
            if (this.layout.isDataQubit(i2, j2) && this.layout.isHole(i + di*2, j + dj*2)) {
                this.errorOverlay.measureDataButClearByConditionallyFlippingStabilizer(i2, j2, i, j);
                this.layout.holes[i2][j2] = true;
            }
        }
        this.layout.holes[i][j] = true;
    }

}

export {SurfaceCode}
