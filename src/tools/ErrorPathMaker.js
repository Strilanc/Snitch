import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"

function roundWithDeadZone(v, d, r) {
    let s = v < 0 ? -1 : +1;
    v *= s;
    if (v < d) {
        return 0;
    }
    v -= d;
    v /= r;
    return Math.round(v) * r * s;
}

function strokeErrorCurveAt(ctx, surface, i, j, xz) {
    let x = i * config.diam + 0.5;
    let y = j * config.diam + 0.5;

    if (surface.isXCheckRow(j) === xz) {
        ctx.moveTo(x + config.diam / 2, y - config.diam / 2);
        ctx.lineTo(x + config.diam / 2, y + config.diam * 3 / 2);
    } else {
        ctx.moveTo(x - config.diam / 2, y + config.diam / 2);
        ctx.lineTo(x + config.diam * 3 / 2, y + config.diam / 2);
    }
}

/**
 * Implements an effect that can be applied to a surface code grid.
 */
class ErrorPathMakerType extends Tool {
    _checkArgs(args) {
        return args.mousePos !== undefined &&
            args.dragStartPos !== undefined &&
            !args.ctrlKey &&
            args.mouseButton === 0 &&
            args.surface.isDataQubit(Math.floor(args.dragStartPos[0]), Math.floor(args.dragStartPos[1]), undefined);
    }

    /**
     * @param {!ToolEffectArgs} args
     * @returns {!{path: !Array.<![!int, !int]>, xz: !boolean, tears: !Array.<![!int, !int]>}}
     * @private
     */
    _argsToXZPath(args) {
        let i1 = Math.floor(args.dragStartPos[0]);
        let j1 = Math.floor(args.dragStartPos[1]);
        let di = args.mousePos[0] - i1 - 0.5;
        let dj = args.mousePos[1] - j1 - 0.5;
        let da = Math.round((di + dj) / 2);
        let db = Math.round((di - dj) / 2);
        let i2 = i1 + da + db;
        let j2 = j1 + da - db;

        let xz = !args.shiftKey;
        let dir1 = args.surface.errorOrientation(i1, j1, xz);
        let dir2 = args.surface.errorOrientation(i2, j2, xz);

        if (i1 === i2 && j1 === j2) {
            return {
                path: [[i1, j1]],
                xz,
                tears: [
                    [i1 + dir1[0], j1 + dir1[1]],
                    [i1 - dir1[0], j1 - dir1[1]]
                ],
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
        let path = args.surface.pathAlongCheckQubits(q0[0], q0[1], q1[0], q1[1], false);
        if (path.length === 0) {
            path = args.surface.pathAlongCheckQubits(q0[0], q0[1], q1[0], q1[1], false, true);
        }
        path.splice(0, 0, [i1, j1]);
        path.push([i2, j2]);
        return {path, xz, tears: [p0, p1]};
    }

    drawPreview(ctx, args) {
        if (!this._checkArgs(args)) {
            return;
        }
        let {path, xz} = this._argsToXZPath(args);

        ctx.save();
        ctx.beginPath();
        for (let [i, j] of path) {
            strokeErrorCurveAt(ctx, args.surface, i, j, xz);
        }

        ctx.fillStyle = '#800';
        for (let [i, j] of [path[0], path[path.length - 1]]) {
            ctx.fillRect((i + 0.3) * config.diam, (j + 0.3) * config.diam, config.diam * 0.4, config.diam * 0.4);
        }

        ctx.strokeStyle = '#800';
        ctx.stroke();
        ctx.strokeStyle = xz ? config.zOnColor : config.xOnColor;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }

    applyEffect(args) {
        if (!this._checkArgs(args)) {
            return;
        }
        let {path, xz} = this._argsToXZPath(args);
        for (let [i, j] of path) {
            args.surface.doXZ(i, j, xz);
        }
    }
}

let ErrorPathMaker = new ErrorPathMakerType();

export {ErrorPathMaker}
