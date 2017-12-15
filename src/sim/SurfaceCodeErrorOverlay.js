import {CARDINALS} from 'src/sim/Util.js'
import {makeGrid} from 'src/sim/Util.js'
import {Axis, AXES, Z_AXIS, X_AXIS} from "src/sim/Util.js";


class SurfaceCodeErrorOverlay {
    /**
     * @param {!SurfaceCode} surface
     */
    constructor(surface) {
        this.surface = surface;
        this.xFlips = makeGrid(surface.layout.width, surface.layout.height, () => false);
        this.zFlips = makeGrid(surface.layout.width, surface.layout.height, () => false);
    }

    /**
     * @param {!Axis} axis
     * @returns {!Array.<!Array.<!boolean>>}
     */
    flipsForAxis(axis) {
        return axis.isX() ? this.xFlips : this.zFlips;
    }

    /**
     * @param {!number} p
     */
    error(p = 0.0001) {
        for (let [i, j] of this.surface.layout.dataPoints()) {
            if (Math.random() < p) {
                if (Math.random() < 0.5) {
                    this.flipQubit(i, j, X_AXIS);
                }
                if (Math.random() < 0.5) {
                    this.flipQubit(i, j, Z_AXIS);
                }
            }
        }
    }

    /**
     * @param {!Axis} axis
     * @param {!Array.<![!int, !int]>} areaPoints
     * @param {!Map.<!int, !int>} areaIndexMap
     * @param {!Array.<!int>} areaVals
     * @returns {undefined|![!int, !int]}
     * @private
     */
    _getBestRepresentative(axis, areaPoints, areaIndexMap, areaVals) {
        let layout = this.surface.layout;
        let best_i = undefined;
        let best_j = undefined;
        let best_d = -Infinity;
        let best_n = false;
        for (let [i, j] of areaPoints) {
            if (!layout.isDataQubit(i, j)) {
                let n = !layout.neighbors(i, j).every(([i2, j2]) => !this.flipsForAxis(axis.opposite())[i2][j2]);
                let maxAdjacentAreaSize = Math.max(Infinity,
                    ...layout.neighbors(i, j).
                    filter(([i2, j2]) => areaPoints.length - 1 !== areaIndexMap.get(j2*layout.width + i2)).
                    map(([i2, j2]) => areaVals[areaIndexMap.get(j2*layout.width + i2)]));
                if (maxAdjacentAreaSize <= areaPoints.length) {
                    continue;
                }
                let d = Math.min(i, j, layout.width - i - 1, layout.height - j - 1);
                if ((n && !best_n) || (n === best_n && d > best_d)) {
                    best_i = i;
                    best_j = j;
                    best_d = d;
                    best_n = n;
                }
            }
        }
        if (best_i !== undefined && layout.isCheckQubit(best_i, best_j, axis.opposite())) {
            return [best_i, best_j];
        }
        return undefined;
    }

    /**
     * @param {!Axis} axis
     * @returns {!Array.<![!int, !int]>}
     * @private
     */
    _getClosedCurveRegionRepresentatives(axis) {
        let flips = this.flipsForAxis(axis.opposite());
        let layout = this.surface.layout;
        let areaIndexMap = new Map();
        let areaVals = [];
        let reps = [];
        for (let pt of layout.points) {
            let queue = [pt];
            let area = [];
            let hitOppositeTypeSide = false;
            while (queue.length > 0) {
                let [i, j] = queue.pop();
                if (axis.isZ() ? (i < 0 || j < 0) : (i >= layout.width || j >= layout.height)) {
                    hitOppositeTypeSide = true;
                }
                let k = j * layout.width + i;
                if (areaIndexMap.has(k) ||
                        layout.isHole(i, j) ||
                        flips[i][j] ||
                        layout.isCheckQubit(i, j, axis)) {
                    continue;
                }
                areaIndexMap.set(k, areaVals.length);
                area.push([i, j]);
                for (let [di, dj] of CARDINALS) {
                    queue.push([i + di, j + dj]);
                }
            }

            if (hitOppositeTypeSide) {
                areaVals.push(Infinity);
            } else if (area.length > 0) {
                areaVals.push(area.length);
                let v = this._getBestRepresentative(axis, area, areaIndexMap, areaVals);
                if (v !== undefined) {
                    reps.push(v);
                }
            }
        }
        return reps;
    }

    shrinkCurves() {
        let layout = this.surface.layout;
        for (let axis of AXES) {
            let flips = this.flipsForAxis(axis.opposite());
            let reps = this._getClosedCurveRegionRepresentatives(axis);
            for (let [i, j] of reps) {
                for (let [di, dj] of CARDINALS) {
                    let i2 = i + di;
                    let j2 = j + dj;
                    if (layout.isDataQubit(i2, j2)) {
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
     * @param {!boolean} flipMark
     * @param {!boolean} flipQubit
     */
    flipQubit(i, j, axis, flipMark=true, flipQubit=true) {
        if (flipQubit && this.surface.layout.isDataQubit(i, j)) {
            if (axis.isX()) {
                this.surface.state.x(this.surface.qubits[i][j]);
            } else {
                this.surface.state.z(this.surface.qubits[i][j]);
            }
        }

        if (flipMark && this.surface.layout.isInBounds(i, j)) {
            let flips = this.flipsForAxis(axis);
            flips[i][j] = !flips[i][j];
        }
    }

    flipStabilizer(i, j, flipMarks=true, flipQubits=true) {
        let axis = this.surface.layout.colCheckType(i);
        console.log(axis.toString());
        for (let [i2, j2] of this.surface.layout.neighbors(i, j)) {
            this.flipQubit(i2, j2, axis, flipMarks, flipQubits);
        }
    }

    /**
     * @param {!int} x1
     * @param {!int} y1
     * @param {!int} x2
     * @param {!int} y2
     * @param {!Axis} axis
     */
    flipQubitsAlongPath(x1, y1, x2, y2, axis) {
        for (let [i, j] of this.surface.layout.pathAlongCheckQubits(x1, y1, x2, y2, false)) {
            if (!this.surface.layout.isHole(i, j)) {
                this.flipQubit(i, j, axis);
            }
        }
    }

    measureDataButClearByConditionallyFlippingStabilizer(iData, jData, iCheck, jCheck) {
        let axis = this.surface.layout.colCheckType(iCheck);
        let marked = this.flipsForAxis(axis)[iData][jData];
        let q = this.surface.qubits[iData][jData];
        if (axis === X_AXIS) {
            this.surface.state.h(q);
        }
        let on = this.surface.state.measure(q);
        if (axis === X_AXIS) {
            this.surface.state.h(q);
        }
        this.flipStabilizer(iCheck, jCheck, marked, on);
    }

    clearFlips() {
        this.xFlips = makeGrid(this.surface.layout.width, this.surface.layout.height, () => false);
        this.zFlips = makeGrid(this.surface.layout.width, this.surface.layout.height, () => false);
    }
}

export {SurfaceCodeErrorOverlay}
