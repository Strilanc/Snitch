/**
 * A qubit axis that operations can measure along, rotate around, etc.
 */
class Axis {
    /**
     * @param {!string} name
     */
    constructor(name) {
        this.label = name;
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
        return Axis.zIf(this.isX());
    }

    /**
     * @param {!boolean} useZAxisElseXAxis
     * @returns {!Axis}
     */
    static zIf(useZAxisElseXAxis) {
        return useZAxisElseXAxis ? Z_AXIS : X_AXIS;
    }

    /**
     * @param {!boolean} useXAxisElseZAxis
     * @returns {!Axis}
     */
    static xIf(useXAxisElseZAxis) {
        return useXAxisElseZAxis ? X_AXIS : Z_AXIS;
    }

    /**
     * @returns {!string}
     */
    toString() {
        return this.label;
    }

    /**
     * @returns {!Axis}
     */
    static get X() {
        return X_AXIS;
    }

    /**
     * @returns {!Axis}
     */
    static get Z() {
        return Z_AXIS;
    }

    /**
     * @returns {![!Axis, !Axis]}
     */
    static get XZ() {
        return AXES;
    }
}

const X_AXIS = new Axis('X');
const Z_AXIS = new Axis('Z');
const AXES = [X_AXIS, Z_AXIS];

export {Axis}
