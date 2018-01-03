import {DetailedError} from 'src/base/DetailedError.js'
import {CARDINALS} from 'src/sim/Util.js'


/**
 * The location of one of the edges beside a qubit in the surface code.
 *
 * Note: handed methods use a coordinate system that makes sense when *drawing*.
 * - When moving rightward, i increases.
 * - When moving downward, j increases.
 * - The left of (i, j) has di = -1 and dj = 0.
 * - The top of (i, j) has di = 0 and dj = -1.
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
     * @param {!int} i
     * @param {!int} j
     * @returns {!Array.<!BorderLoc>}
     */
    static allSides(i, j) {
        return CARDINALS.map(([di, dj]) => new BorderLoc(i, j, di, dj));
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
     * Determines the wall your left hand is touching after you start at position (i, j), with your left hand against a
     * wall towards (di, dj), and slide your left hand around an inside corner.
     *
     * Before:
     *
     *   @@@
     *   @<
     *   @
     *
     * After:
     *
     *   @@@
     *   @^
     *   @
     *
     * @returns {!BorderLoc}
     */
    nextLeftHandWithinSameCell() {
        return new BorderLoc(this.i, this.j, -this.dj, this.di);
    }

    /**
     * Determines the wall your left hand is touching after you start at position (i, j), with your left hand against a
     * a wall towards (di, dj), and travel forward one step while sliding your left hand along a straight wall.
     *
     * Before:
     *          0
     *    @@    1
     *    @@<   2
     *
     * After:
     *          0
     *    @@<   1
     *    @@    2
     *
     * @returns {!BorderLoc}
     */
    nextLeftHandAlongWall() {
        return new BorderLoc(this.i - this.dj, this.j + this.di, this.di, this.dj);
    }

    /**
     * Determines the wall your left hand is touching after you start at position (i, j), with your left hand against a
     * wall towards (di, dj), and travel forward one step while sliding your left hand around an exterior corner.
     *
     * Before:
     *          0
     *    @@<   1
     *    @@    2
     *
     * After:
     *     v    0
     *    @@    1
     *    @@    2
     *
     * @returns {!BorderLoc}
     */
    nextLeftHandAroundCorner() {
        return new BorderLoc(
            this.i + this.di - this.dj,
            this.j + this.di + this.dj,
            this.dj,
            -this.di);
    }

    /**
     * Determines the wall your right hand is touching after you start at position (i, j), with your right hand against
     * a wall towards (di, dj), and slide your right hand around an inside corner.
     *
     * Before:
     *
     *   @@@    0
     *   @^     1
     *   @      2
     *
     * After:
     *
     *   @@@    0
     *   @<     1
     *   @      2
     *
     * @returns {!BorderLoc}
     */
    nextRightHandWithinSameCell() {
        return new BorderLoc(this.i, this.j, this.dj, -this.di);
    }

    /**
     * Determines the wall your right hand is touching after you start at position (i, j), with your right hand against
     * a wall towards (di, dj), and travel forward one step while sliding your right hand along a straight wall.
     *
     * Before:
     *
     *    @@    0
     *   >@@    1
     *
     * After:
     *
     *   >@@    0
     *    @@    1
     *
     * @returns {!BorderLoc}
     */
    nextRightHandAlongWall() {
        return new BorderLoc(this.i + this.dj, this.j - this.di, this.di, this.dj);
    }

    /**
     * Determines the wall your right hand is touching after you start at position (i, j), with your right hand against
     * a wall towards (di, dj), and travel forward one step while sliding your right hand around an exterior corner.
     *
     * Before:
     *          0
     *   >@@    1
     *    @@    2
     *
     * After:
     *    v     0
     *    @@    1
     *    @@    2
     *
     * @returns {!BorderLoc}
     */
    nextRightHandAroundCorner() {
        return new BorderLoc(
            this.i + this.di + this.dj,
            this.j - this.di + this.dj,
            -this.dj,
            this.di);
    }
}

export {BorderLoc}
