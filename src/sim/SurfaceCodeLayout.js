import {seq} from "src/base/Seq.js";
import {squaredDistanceFromLine, makeGrid, cloneGrid} from 'src/sim/Util.js'
import {CARDINALS} from 'src/sim/Util.js'


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
 * @param {!boolean} xz
 * @yields {![!int, !int]}
 * @private
 */
function* _checkQubits(layout, xz) {
    for (let pt of layout.points) {
        if (layout.isCheckQubit(pt[0], pt[1], xz)) {
            yield pt;
        }
    }
}

class SurfaceCodeLayout {
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
     * @param {!int} col
     * @param {!boolean} zx
     * @returns {!boolean}
     */
    isCheckCol(col, zx) {
        return ((col & 1) === (zx ? 0 : 1)) === this.firstColIsX;
    }

    /**
     * @param {!int} row
     * @param {!boolean} zx
     * @returns {!boolean}
     */
    isCheckRow(row, zx) {
        return ((row & 1) === (zx ? 0 : 1)) === this.firstRowIsX;
    }

    /**
     * @param {!int} col
     * @returns {!boolean}
     */
    isXCheckCol(col) {
        return this.isCheckCol(col, true);
    }

    /**
     * @param {!int} col
     * @returns {!boolean}
     */
    isZCheckCol(col) {
        return this.isCheckCol(col, false);
    }

    /**
     * @param {!int} row
     * @returns {!boolean}
     */
    isXCheckRow(row) {
        return this.isCheckRow(row, true);
    }

    /**
     * @param {!int} row
     * @returns {!boolean}
     */
    isZCheckRow(row) {
        return this.isCheckRow(row, false);
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
     * @param {!boolean} xz
     * @returns {!Iterable.<[!int, !int]>}
     */
    checkQubits(xz) {
        return _checkQubits(this, xz);
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
     * @returns {!Array.<![!int, !int]>}
     */
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
     * @param {!int} i
     * @param {!int} j
     * @param {!int} di
     * @param {!int} dj
     * @returns {undefined|'X'|'Z'}
     */
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

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} zx
     * @param {!boolean} ignoreHole
     * @param {!boolean} ignoreBounds
     * @returns {!boolean}
     */
    isCheckQubit(i, j, zx=undefined, ignoreHole=false, ignoreBounds=false) {
        if (zx === undefined) {
            return (ignoreHole || !this.isHole(i, j)) &&
                (ignoreBounds || this.isInBounds(i, j)) &&
                this.isXCheckCol(i) === this.isXCheckRow(j);
        }
        return (ignoreHole || !this.isHole(i, j)) &&
            (ignoreBounds || this.isInBounds(i, j)) &&
            this.isCheckCol(i, zx) &&
            this.isCheckRow(j, zx);
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} ignoreHole
     * @param {!boolean} ignoreBounds
     * @returns {!boolean}
     */
    isZCheckQubit(i, j, ignoreHole=false, ignoreBounds=false) {
        return this.isCheckQubit(i, j, false, ignoreHole, ignoreBounds);
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!boolean} ignoreHole
     * @param {!boolean} ignoreBounds
     * @returns {!boolean}
     */
    isXCheckQubit(i, j, ignoreHole=false, ignoreBounds=false) {
        return this.isCheckQubit(i, j, true, ignoreHole, ignoreBounds);
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
            this.isXCheckCol(i) !== this.isXCheckRow(j);
    }

    /**
     * @param {!int} x1
     * @param {!int} y1
     * @param {!int} x2
     * @param {!int} y2
     * @param {!boolean} returnCheckQubitsAlongPathInsteadOfDataQubits
     * @param {!boolean} ignoreHoles
     * @returns {!Array.<![!int, !int]>}
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

            let pts = seq(CARDINALS).
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
}

export {SurfaceCodeLayout}
