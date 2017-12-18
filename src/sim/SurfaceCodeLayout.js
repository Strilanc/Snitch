import {seq} from "src/base/Seq.js";
import {squaredDistanceFromLine, makeGrid, cloneGrid} from 'src/sim/Util.js'
import {DetailedError} from 'src/base/DetailedError.js'
import {CARDINALS} from 'src/sim/Util.js'
import {Axis, X_AXIS, Z_AXIS} from "src/sim/Util.js";


/**
 * @param {!SurfaceCodeLayout} layout
 * @param {!boolean} ignoreHoles
 * @yields {![!int, !int]}
 * @private
 */
function* _dataPoints(layout, ignoreHoles) {
    for (let pt of layout.points) {
        if (layout.isDataQubit(pt[0], pt[1], ignoreHoles)) {
            yield pt;
        }
    }
}

/**
 * @param {!SurfaceCodeLayout} layout
 * @param {!int} pad
 * @yields {![!int, !int]}
 * @private
 */
function* _holes(layout, pad=1) {
    for (let i = -pad; i < layout.width+pad; i++) {
        for (let j = -pad; j < layout.height+pad; j++) {
            if (layout.isHole(i, j)) {
                yield [i, j];
            }
        }
    }
}

/**
 * @param {!SurfaceCodeLayout} layout
 * @param {undefined|!Axis} axis
 * @yields {![!int, !int]}
 * @private
 */
function* _checkQubits(layout, axis) {
    for (let pt of layout.points) {
        if (layout.isCheckQubit(pt[0], pt[1], axis)) {
            yield pt;
        }
    }
}

/**
 * The location of one of the edges beside a qubit in the surface code.
 */
class BorderLoc {
    /**
     * @param {!number} i
     * @param {!number} j
     * @param {!number} di
     * @param {!number} dj
     */
    constructor(i, j, di, dj) {
        if ((di !== 0 && dj !== 0) || (Math.abs(di) !== 1 && Math.abs(dj) !== 1)) {
            throw new DetailedError('[di, dj] must be an axis-aligned unit vector.', {i, j, di, dj});
        }

        this.i = i;
        this.j = j;
        this.di = di;
        this.dj = dj;
    }

    toString() {
        let label = ['left', 'top', 'right', 'bottom'][this.di === -1 ? 0 : this.dj + 2];
        return `${label}(${this.i}, ${this.j})`
    }

    /**
     * @returns {![!number, !number]}
     */
    center() {
        return [this.i + 0.5 + this.di * 0.5, this.j + 0.5 + this.dj * 0.5];
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @returns {!BorderLoc}
     */
    static left(i, j) {
        return new BorderLoc(i, j, -1, 0);
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @returns {!BorderLoc}
     */
    static right(i, j) {
        return new BorderLoc(i, j, +1, 0);
    }

    /**
     * Warning: this is the top *when drawing* and *making diagrams*, not in the sense of larger-y-coordinate.
     *
     * @param {!int} i
     * @param {!int} j
     * @returns {!BorderLoc}
     */
    static top(i, j) {
        return new BorderLoc(i, j, 0, -1);
    }

    /**
     * Warning: this is the bottom *when drawing* and *making diagrams*, not in the sense of lesser-y-coordinate.
     *
     * @param {!int} i
     * @param {!int} j
     * @returns {!BorderLoc}
     */
    static bottom(i, j) {
        return new BorderLoc(i, j, 0, +1);
    }

    /**
     * @returns {!BorderLoc}
     */
    backside() {
        return new BorderLoc(this.i + this.di, this.j + this.dj, -this.di, -this.dj);
    }

    /**
     * @param {!BorderLoc|*} other
     * @returns {!boolean}
     */
    isEqualTo(other) {
        return other instanceof BorderLoc &&
            this.i === other.i &&
            this.j === other.j &&
            this.di === other.di &&
            this.dj === other.dj;
    }

    /**
     * @returns {!BorderLoc}
     */
    nextCounterClockwiseWithinSameCell() {
        return new BorderLoc(this.i, this.j, -this.dj, this.di);
    }

    /**
     * @returns {!BorderLoc}
     */
    nextCounterClockwiseAlongWall() {
        return new BorderLoc(this.i - this.dj, this.j + this.di, this.di, this.dj);
    }

    /**
     * @returns {!BorderLoc}
     */
    nextCounterClockwiseAroundCorner() {
        return this.nextCounterClockwiseAlongWall().
            nextClockwiseWithinSameCell().
            nextCounterClockwiseAlongWall();
    }

    /**
     * @returns {!BorderLoc}
     */
    nextClockwiseWithinSameCell() {
        return new BorderLoc(this.i, this.j, this.dj, -this.di);
    }

    /**
     * @returns {!BorderLoc}
     */
    nextClockwiseAlongWall() {
        return new BorderLoc(this.i + this.dj, this.j - this.di, this.di, this.dj);
    }

    /**
     * @returns {!BorderLoc}
     */
    nextClockwiseAroundCorner() {
        return this.nextClockwiseAlongWall().
            nextCounterClockwiseWithinSameCell().
            nextClockwiseAlongWall();
    }
}


class SurfaceCodeLayout {
    /**
     * @param {!int} width
     * @param {!int} height
     * @param {!boolean} firstRowIsX
     * @param {!boolean} firstColIsX
     */
    constructor(width, height, firstRowIsX=false, firstColIsX=false) {
        this.width = width;
        this.height = height;
        this.holes = makeGrid(width, height, () => false);
        this.firstRowIsX = firstRowIsX;
        this.firstColIsX = firstColIsX;

        this.points = [];
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                this.points.push([i, j]);
            }
        }
    }

    /**
     * @returns {!SurfaceCodeLayout}
     */
    clone() {
        let r = new SurfaceCodeLayout(0, 0);
        r.width = this.width;
        r.height = this.height;
        r.holes = cloneGrid(this.holes);
        r.firstRowIsX = this.firstRowIsX;
        r.firstColIsX = this.firstColIsX;
        r.points = this.points.map(e => e);
        return r;
    }

    /**
     * @param {!BorderLoc} borderLoc
     * @param {!Axis} type
     * @param {!boolean} clockwise
     * @returns {undefined|!BorderLoc}
     * @private
     */
    _nextBorder(borderLoc, type, clockwise) {
        let options = clockwise ? [
            borderLoc.nextClockwiseWithinSameCell(),
            borderLoc.nextClockwiseAlongWall(),
            borderLoc.nextClockwiseAroundCorner()
        ] : [
            borderLoc.nextCounterClockwiseWithinSameCell(),
            borderLoc.nextCounterClockwiseAlongWall(),
            borderLoc.nextCounterClockwiseAroundCorner()
        ];
        for (let a of options) {
            if (this.borderType(a) === type) {
                return a;
            }
        }
        return undefined;
    }

    /**
     * @param {!BorderLoc} borderLoc
     * @param {!Axis} type
     * @param {!boolean} clockwise
     * @param {!boolean} keepBorderPiecesBetweenAHoleAndACheckQubit
     * @returns {!{locs: !Array.<!BorderLoc>, cycle: !boolean}}
     * @private
     */
    _scanBorder(borderLoc, type, clockwise, keepBorderPiecesBetweenAHoleAndACheckQubit=true) {
        let locs = [borderLoc];
        let cur = borderLoc;
        while (true) {
            cur = this._nextBorder(cur, type, clockwise);
            if (cur === undefined || cur.isEqualTo(borderLoc)) {
                break;
            }
            if (keepBorderPiecesBetweenAHoleAndACheckQubit ||
                    this.isDataQubit(cur.i, cur.j) ||
                    this.isDataQubit(cur.i + cur.di, cur.j + cur.dj)) {
                locs.push(cur);
            }
        }
        return {locs, cycle: cur !== undefined};
    }

    /**
     * @param {!BorderLoc} borderLoc
     * @param {!boolean} keepBorderPiecesBetweenAHoleAndACheckQubit
     * @returns {undefined|!{locs: !Array.<!BorderLoc>, cycle: !boolean, axis: !Axis}}
     */
    fullContiguousBorderTouching(borderLoc, keepBorderPiecesBetweenAHoleAndACheckQubit=true) {
        let axis = this.borderType(borderLoc);
        if (axis === undefined) {
            return undefined;
        }

        let {locs, cycle} = this._scanBorder(borderLoc, axis, true, keepBorderPiecesBetweenAHoleAndACheckQubit);
        if (!cycle) {
            let otherLocs = this._scanBorder(borderLoc, axis, false, keepBorderPiecesBetweenAHoleAndACheckQubit).locs;
            otherLocs.splice(0, 1);
            otherLocs.reverse();
            locs.splice(0, 0, ...otherLocs);
        }
        return {locs, cycle, axis};
    }

    /**
     * @param {!int} col
     * @returns {!Axis}
     */
    colCheckType(col) {
        return ((col & 1) === 0) !== this.firstColIsX ? Z_AXIS : X_AXIS;
    }

    /**
     * @param {!int} row
     * @returns {!Axis}
     */
    rowCheckType(row) {
        return ((row & 1) === 0) !== this.firstRowIsX ? Z_AXIS : X_AXIS;
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!int} padding
     * @returns {!boolean}
     */
    isInBounds(i, j, padding=0) {
        return i >= -padding && j >= -padding && i < this.width+padding && j < this.height + padding;
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @returns {!boolean}
     */
    isHole(i, j) {
        return !this.isInBounds(i, j) || this.holes[i][j];
    }

    dataPoints(ignoreHoles=false) {
        return _dataPoints(this, ignoreHoles);
    }

    /**
     * @param {undefined|!Axis} axis
     * @returns {!Iterable.<[!int, !int]>}
     */
    checkQubits(axis=undefined) {
        return _checkQubits(this, axis);
    }

    /**
     * @param {!int} pad
     * @returns {!Iterable.<[!int, !int]>}
     */
    holePoints(pad=1) {
        return _holes(this, pad);
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} ignoreHoles
     * @param {!boolean} ignoreBounds
     * @returns {!Array.<![!int, !int]>}
     */
    neighbors(i, j, ignoreHoles=false, ignoreBounds=false) {
        let result = [];
        for (let [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            let i2 = i + di;
            let j2 = j + dj;
            if ((ignoreBounds || this.isInBounds(i2, j2)) && (ignoreHoles || !this.isHole(i2, j2))) {
                result.push([i2, j2]);
            }
        }
        return result;
    }

    /**
     * @param {!int} x
     * @param {!int} y
     * @returns {!Array.<![!int, !int]>}
     */
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

    /**
     * @param {!number} x
     * @param {!number} y
     * @param {!boolean} keepBorderPiecesBetweenAHoleAndACheckQubit
     * @param {undefined|!Axis} axis The desired kind of hole border, or undefined if no preference.
     * @returns {undefined|!BorderLoc}
     */
    nearestOutsideBorderLocFromPointInHole(x, y, keepBorderPiecesBetweenAHoleAndACheckQubit=true, axis=undefined) {
        let i = Math.floor(x);
        let j = Math.floor(y);
        if (!this.isHole(i, j)) {
            return undefined;
        }

        let borders = this.holeOutsideBorderLocs(i, j, keepBorderPiecesBetweenAHoleAndACheckQubit, axis);
        if (borders.length === 0) {
            return undefined;
        }

        return seq(borders).minBy(loc => {
            let [x2, y2] = loc.center();
            return (x2 - x)*(x2 - x) + (y2 - y)*(y2 - y);
        });
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {undefined|!Axis} axis The desired kind of hole border, or undefined if no preference.
     * @returns {undefined|!BorderLoc}
     */
    nearbyCheckBorderLoc(i, j, axis=undefined) {
        let covered = makeGrid(this.width, this.height, () => false);
        let q = [[i, j]];
        while (q.length > 0) {
            let [x, y] = q.pop();
            if (covered[x][y] || !this.isInBounds(x, y)) {
                continue;
            }
            covered[x][y] = true;

            for (let [di, dj] of CARDINALS) {
                let type = this.borderType(new BorderLoc(x, y, di, dj));
                if (type === undefined) {
                    q.splice(0, 0, [x + di, y + dj]);
                } else if ((axis === undefined || axis === type) && this.isDataQubit(x, y)) {
                    return new BorderLoc(x, y, di, dj).backside();
                }
            }
        }

        return undefined;
    }

    /**
     * @param {!int} x
     * @param {!int} y
     * @param {!boolean} keepBorderPiecesBetweenAHoleAndACheckQubit
     * @param {undefined|!Axis} axis The desired kind of hole border, or undefined if no preference.
     * @returns {!Array.<!BorderLoc>}
     */
    holeOutsideBorderLocs(x, y, keepBorderPiecesBetweenAHoleAndACheckQubit=true, axis=undefined) {
        if (!this.isHole(x, y)) {
            throw new DetailedError('Not a hole.', {x, y});
        }

        let q = [[x, y]];
        let seen = makeGrid(this.width + 2, this.height + 2, () => false);
        let result = [];
        while (q.length > 0) {
            let [i, j] = q.pop();
            if (!this.isInBounds(i, j, 1) || !this.isHole(i, j) || seen[i+1][j+1]) {
                continue;
            }
            seen[i+1][j+1] = true;

            for (let [di, dj] of CARDINALS) {
                q.push([i + di, j + dj]);
                let type = this.borderType(new BorderLoc(i, j, di, dj));
                if (type !== undefined && (axis === undefined || axis === type)) {
                    if (keepBorderPiecesBetweenAHoleAndACheckQubit ||
                            this.isDataQubit(i, j) ||
                            this.isDataQubit(i + di, j + dj)) {
                        result.push(new BorderLoc(i, j, di, dj).backside());
                    }
                }
            }
        }
        return result;
    }

    /**
     * @param {!int} i1
     * @param {!int} j1
     * @param {!int} i2
     * @param {!int} j2
     * @returns {!boolean}
     */
    isSameHole(i1, j1, i2, j2) {
        for (let [i, j] of this.holeFloodFill(i1, j1)) {
            if (i === i2 && j === j2) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param {!BorderLoc} b1
     * @param {!BorderLoc} b2
     * @returns {!boolean}
     */
    areBorderLocsOnSameContiguousBorder(b1, b2) {
        let r = this.fullContiguousBorderTouching(b1);
        return r !== undefined && !r.locs.every(e => !e.isEqualTo(b2));
    }

    /**
     * @param {!BorderLoc} loc
     * @returns {undefined|!Axis}
     */
    borderType(loc) {
        let {i, j, di, dj} = loc;
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
        return Axis.zIf(z1 || x2);
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {undefined|!Axis} axis
     * @param {!boolean} ignoreHole
     * @param {!boolean} ignoreBounds
     * @returns {!boolean}
     */
    isCheckQubit(i, j, axis=undefined, ignoreHole=false, ignoreBounds=false) {
        if (axis === undefined) {
            return (ignoreHole || !this.isHole(i, j)) &&
                (ignoreBounds || this.isInBounds(i, j)) &&
                this.colCheckType(i) === this.rowCheckType(j);
        }
        return (ignoreHole || !this.isHole(i, j)) &&
            (ignoreBounds || this.isInBounds(i, j)) &&
            this.colCheckType(i) === axis &&
            this.rowCheckType(j) === axis;
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} ignoreHole
     * @param {!boolean} ignoreBounds
     * @returns {!boolean}
     */
    isZCheckQubit(i, j, ignoreHole=false, ignoreBounds=false) {
        return this.isCheckQubit(i, j, Z_AXIS, ignoreHole, ignoreBounds);
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} ignoreHole
     * @param {!boolean} ignoreBounds
     * @returns {!boolean}
     */
    isXCheckQubit(i, j, ignoreHole=false, ignoreBounds=false) {
        return this.isCheckQubit(i, j, X_AXIS, ignoreHole, ignoreBounds);
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} ignoreHoles
     * @param {!boolean} ignoreBounds
     * @returns {!boolean}
     */
    isDataQubit(i, j, ignoreHoles=false, ignoreBounds=false) {
        return (ignoreHoles || !this.isHole(i, j)) &&
            (ignoreBounds || this.isInBounds(i, j)) &&
            this.colCheckType(i) !== this.rowCheckType(j);
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!Axis} axis
     * @returns {!Array.<![!int, !int]>}
     */
    errorCurveOrientation(i, j, axis) {
        if (!this.isDataQubit(i, j, true, true)) {
            throw new DetailedError('Not an error route', {i, j, axis});
        }
        let vertical = this.colCheckType(i) === axis;
        return vertical ? [0, 1] : [1, 0];
    }

    /**
     * @param {!int} x1
     * @param {!int} y1
     * @param {!int} x2
     * @param {!int} y2
     * @param {!boolean} returnCheckQubitsAlongPathInsteadOfDataQubits
     * @returns {undefined|!Array.<![!int, !int]>}
     */
    pathAlongCheckQubits(x1, y1, x2, y2, returnCheckQubitsAlongPathInsteadOfDataQubits) {
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

            let pts = seq(CARDINALS).
                sortedBy(([di, dj]) => squaredDistanceFromLine(i + di*2, j + dj*2, x1, y1, x2, y2)).
                toArray();
            for (let [di, dj] of pts) {
                let i2 = i + di;
                let j2 = j + dj;
                let i3 = i + di*2;
                let j3 = j + dj*2;
                if (this.isDataQubit(i2, j2) && (this.isCheckQubit(i3, j3) || (i3 === x2 && j3 === y2))) {
                    queue.push([i3, j3, [-di, -dj]]);
                }
            }
        }
        if (dirs[x2+1] === undefined || dirs[x2+1][y2+1] === undefined) {
            return undefined;
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
     * Figures out a path or cycle of data qubits that the user is referring to via a mouse drag.
     * @param {!number} x1
     * @param {!number} y1
     * @param {!number} x2
     * @param {!number} y2
     * @param {undefined|!Axis} axis
     * @returns {!{
     *     path: undefined|!Array.<![!int, !int]>,
     *     pathType: !Axis,
     *     anchorPoints: !Array.<![!number, !number]>,
     *  }}
     */
    mouseSegmentToDataQubits(x1, y1, x2, y2, axis=undefined) {
        let p1 = this._mousePointToAnchor(x1, y1, axis);
        let p2 = this._mousePointToAnchor(x2, y2, p1.type);

        if (p1.checkPos[0] === p2.checkPos[0] && p1.checkPos[1] === p2.checkPos[1]) {
            // When hovering over a hole, select the entire nearest border.
            if (p1.border !== undefined) {
                return {
                    path: this.fullContiguousBorderTouching(p1.border, false).locs.map(e => [e.i, e.j]),
                    pathType: p1.type.opposite(),
                    anchorPoints: [p1.border.center()],
                };
            }

            // When hovering over empty area, cross the nearest data qubit.
            let dx = x2 - p1.checkPos[0] - 0.5;
            let dy = y2 - p1.checkPos[1] - 0.5;
            if (Math.abs(dx) > Math.abs(dy)) {
                dx = dx < 0 ? -1 : 1;
                dy = 0;
            } else {
                dx = 0;
                dy = dy < 0 ? -1 : 1;
            }
            let i = p1.checkPos[0] + dx*2;
            let j = p1.checkPos[1] + dy*2;
            if (this.isCheckQubit(i, j, p1.type, true, true)) {
                return {
                    path: this.isDataQubit(i - dx, j - dy) ? [[i - dx, j - dy]] : undefined,
                    pathType: p1.type,
                    anchorPoints: [
                        [p1.checkPos[0] + 0.5, p1.checkPos[1] + 0.5],
                        [p1.checkPos[0] + 0.5 + dx*2, p1.checkPos[1] + 0.5 + dy*2],
                    ],
                }
            }
        }

        let path = this.pathAlongCheckQubits(
            p1.checkPos[0], p1.checkPos[1], p2.checkPos[0], p2.checkPos[1], false, false);
        return {
            path,
            pathType: p1.type,
            anchorPoints: [p1, p2].
                map(e => e.border !== undefined ? e.border.center() : e.checkPos.map(c => c + 0.5)),
        };
    }

    /**
     * @param {!number} x
     * @param {!number} y
     * @param {undefined|!Axis} axis
     * @returns {!{border: undefined|!BorderLoc, checkPos: ![!int, !int], type: !Axis}}
     */
    _mousePointToAnchor(x, y, axis=undefined) {
        let loc = this.nearestOutsideBorderLocFromPointInHole(x, y, false, axis);
        if (loc !== undefined) {
            let inside = loc.backside();
            return {
                border: loc,
                checkPos: [inside.i, inside.j],
                type: this.borderType(loc)
            };
        }

        let [i, j] = this.nearestCheckCoord(x, y, axis);
        return {
            border: undefined,
            checkPos: [i, j],
            type: Axis.zIf(this.isZCheckQubit(i, j, true, true)),
        };
    }

    /**
     * @param {!number} x
     * @param {!number} y
     * @returns {![!int, !int]}
     */
    nearestDataCoord(x, y) {
        let d = this.firstRowIsX === this.firstColIsX ? 1 : 0;
        x -= d + 0.5;
        y -= 0.5;
        let s = Math.round((x + y) / 2);
        let t = Math.round((x - y) / 2);
        return [s + t + d, s - t];
    }

    /**
     * @param {!number} x
     * @param {!number} y
     * @param {undefined|!Axis} axis
     * @returns {![!int, !int]}
     */
    nearestCheckCoord(x, y, axis=undefined) {
        if (axis === undefined) {
            let [i, j] = this.nearestDataCoord(x + 1, y);
            return [i - 1, j];
        }

        let dx = this.firstColIsX !== axis.isX() ? 1 : 0;
        let dy = this.firstRowIsX !== axis.isX() ? 1 : 0;
        x -= dx + 0.5;
        y -= dy + 0.5;
        let i = Math.round(x / 2) * 2;
        let j = Math.round(y / 2) * 2;
        return [i + dx, j + dy];
    }
}

export {SurfaceCodeLayout, BorderLoc}
