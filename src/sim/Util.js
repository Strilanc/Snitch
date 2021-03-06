/**
 * Determines the distance between a target point and an infinitely-extended line specified by two points.
 *
 * @param {!number} x The x-coordinate of the query point.
 * @param {!number} y The y-coordinate of the query point.
 * @param {!number} x1 The x-coordinate of the first point on the line.
 * @param {!number} y1 The y-coordinate of the first point on the line.
 * @param {!number} x2 The x-coordinate of the second point on the line.
 * @param {!number} y2 The y-coordinate of the second point on the line.
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

/**
 * Creates an array of length width, containing of arrays of length height, containing items generated by the given
 * function.
 *
 * @param {!int} width
 * @param {!int} height
 * @param {!function(x: !int, y: !int): T} generatorFunc
 * @returns {!Array.<!Array.<T>>}
 * @template T
 */
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

/**
 * Returns an array of arrays containing the same items as the given array of arrays.
 * @param {!Array.<!Array.<T>>} grid
 * @returns {!Array.<!Array.<T>>}
 * @template T
 */
function cloneGrid(grid) {
    return grid.map(row => row.map(r => r));
}

let CARDINALS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
];

class Axis {
    constructor(label) {
        this.label = label;
    }

    /**
     * @returns {!boolean}
     */
    isX() {
        return this.label === 'X';
    }

    /**
     * @returns {!boolean}
     */
    isZ() {
        return this.label === 'Z';
    }

    /**
     * @returns {!Axis}
     */
    opposite() {
        return this.isX() ? Z_AXIS : X_AXIS;
    }

    /**
     * @param {!boolean} useZAxis
     * @returns {!Axis}
     */
    static zIf(useZAxis) {
        return useZAxis ? Z_AXIS : X_AXIS;
    }

    /**
     * @returns {!string}
     */
    toString() {
        return this.label;
    }
}

const X_AXIS = new Axis('X');
const Z_AXIS = new Axis('Z');
const AXES = [X_AXIS, Z_AXIS];

export {squaredDistanceFromLine, makeGrid, cloneGrid, CARDINALS, Axis, X_AXIS, Z_AXIS, AXES}
