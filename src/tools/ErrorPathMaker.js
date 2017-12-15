/**
 * Implements an effect that can be applied to a surface code grid.
 */
import {config} from "src/config.js"
import {strokeErrorCurveAt} from "src/draw/Common.js";
import {Tool} from "src/tools/Tool.js"
import {Axis} from "src/sim/Util.js";

class ErrorPathMakerType extends Tool {
    constructor() {
        super('C');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.strokeStyle = axis.isX() ? config.xOnColor : config.zOnColor;
        //noinspection JSUnresolvedFunction
        ctx.lineWidth = 2;
        let p = 3;
        ctx.moveTo(p, p);
        ctx.lineTo(p, h-p);
        ctx.lineTo(w-p, h-p);
        ctx.stroke();
        ctx.fillStyle = axis.isX() ? config.xOnColor : config.zOnColor;
        ctx.fillRect(0, 0, 2*p, 2*p);
        ctx.fillRect(w-2*p, h-2*p, 2*p, 2*p);
    }

    canApply(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos !== undefined &&
            args.mouseButton === 0 &&
            args.surface.layout.isDataQubit(...args.surface.layout.nearestDataCoord(...args.dragStartPos), undefined);
    }

    canHoverHint(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos === undefined &&
            args.mouseButton === undefined &&
            args.surface.layout.isDataQubit(...args.surface.layout.nearestDataCoord(...args.mousePos), undefined);
    }

    drawHoverHint(ctx, args) {
        let [i, j] = args.surface.layout.nearestDataCoord(...args.mousePos);
        let axis = Axis.zIf(!args.shiftKey);
        ctx.lineWidth = 3;
        ctx.beginPath();
        strokeErrorCurveAt(ctx, args.surface, i, j, axis);
        //noinspection JSUnresolvedFunction
        ctx.setLineDash([6, 2]);
        ctx.strokeStyle = axis.isZ() ? config.zOnColor : config.xOnColor;
        ctx.stroke();
    }

    /**
     * @param {!ToolEffectArgs} args
     * @returns {!{path: !Array.<![!int, !int]>, axis: !Axis, tears: !Array.<![!int, !int]>}}
     * @private
     */
    argsToUseful(args) {
        let [i1, j1] = args.surface.layout.nearestDataCoord(...args.dragStartPos);
        let [i2, j2] = args.surface.layout.nearestDataCoord(...args.mousePos);

        let axis = Axis.zIf(!args.shiftKey);
        let dir1 = args.surface.layout.errorCurveOrientation(i1, j1, axis);
        let dir2 = args.surface.layout.errorCurveOrientation(i2, j2, axis);

        if (i1 === i2 && j1 === j2) {
            return {
                path: [[i1, j1]],
                axis,
                tears: [
                    [i1 + dir1[0], j1 + dir1[1]],
                    [i1 - dir1[0], j1 - dir1[1]]
                ],
                controlPoints: [[i1, j1]]
            }
        }

        // go in preferred direction until nearly matching
        let si = Math.sign(i2 - i1);
        let sj = Math.sign(j2 - j1);
        let coal = s => s === 0 ? 1 : s;
        let p0 = [i1 - dir1[0]*coal(si), j1 - dir1[1]*coal(sj)];
        let p1 = [i2 - dir2[0]*coal(-si), j2 - dir2[1]*coal(-sj)];
        let q0 = [i1 + dir1[0]*coal(si), j1 + dir1[1]*coal(sj)];
        let q1 = [i2 + dir2[0]*coal(-si), j2 + dir2[1]*coal(-sj)];
        let path = args.surface.layout.pathAlongCheckQubits(q0[0], q0[1], q1[0], q1[1], false);
        if (path.length === 0) {
            path = args.surface.layout.pathAlongCheckQubits(q0[0], q0[1], q1[0], q1[1], false, true);
        }
        path.splice(0, 0, [i1, j1]);
        path.push([i2, j2]);
        return {path, axis, tears: [p0, p1], controlPoints: [[i1, j1], [i2, j2]]};
    }

    drawPreview(ctx, args) {
        let {path, axis, tears, controlPoints} = this.argsToUseful(args);

        ctx.beginPath();
        for (let [i, j] of path) {
            strokeErrorCurveAt(ctx, args.surface, i, j, axis);
        }

        ctx.fillStyle = '#800';
        for (let [i, j] of controlPoints) {
            ctx.fillRect((i + 0.3) * config.diam, (j + 0.3) * config.diam, config.diam * 0.4, config.diam * 0.4);
        }
        ctx.fillStyle = axis.isZ() ? config.zOnColor : config.xOnColor;
        ctx.strokeStyle = '#000';
        for (let [i, j] of tears) {
            ctx.fillRect((i + 0.3) * config.diam, (j + 0.3) * config.diam, config.diam * 0.4, config.diam * 0.4);
            ctx.strokeRect((i + 0.3) * config.diam, (j + 0.3) * config.diam, config.diam * 0.4, config.diam * 0.4);
        }

        ctx.strokeStyle = '#800';
        ctx.stroke();
        ctx.strokeStyle = axis.isZ() ? config.zOnColor : config.xOnColor;
        //noinspection JSUnresolvedFunction
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    applyEffect(args) {
        let {path, axis} = this.argsToUseful(args);
        for (let [i, j] of path) {
            args.surface.errorOverlay.flipQubit(i, j, axis.opposite());
        }
    }
}

let ErrorPathMaker = new ErrorPathMakerType();

export {ErrorPathMaker}
