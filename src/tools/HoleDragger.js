import {config} from "src/config.js"
import {Tool} from "src/tools/Tool.js"
import {ToolEffectArgs} from "src/tools/ToolEffectArgs.js"
import {seq} from "src/base/Seq.js"
import {BorderLoc} from "src/sim/SurfaceCodeLayout.js"

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

class HoleDraggerType extends Tool {
    constructor() {
        super('D');
    }

    drawButtonContents(ctx, w, h, active, axis) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w/2, h/2);

        ctx.strokeStyle = axis.isX() ? config.xBorderColor : config.zBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w/2, h/2);

        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w*0.25, h*0.25);
        ctx.lineTo(w, h);
        ctx.lineTo(w, h*0.5);
        ctx.moveTo(w, h);
        ctx.lineTo(w*0.5, h);
        ctx.stroke();
    }

    canApply(args) {
        return args.mouseButton === 0 &&
            args.surface.layout.isHole(Math.floor(args.startPos[0]), Math.floor(args.startPos[1]));
    }

    canHoverHint(args) {
        return false;
    }

    drawHoverHint(ctx, args) {
        // let i = Math.floor(args.endPos[0]);
        // let j = Math.floor(args.endPos[1]);
        // ctx.strokeStyle = '#000';
        // ctx.lineWidth = 3;
        // ctx.strokeRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
    }

    /**
     * @param {!ToolEffectArgs} args
     * @returns {!{
     *     i: !int,
     *     j: !int,
     *     di: !int,
     *     dj: !int,
     *     startArea: !Array.<![!int, !int]>,
     *     endArea: !Array.<![!int, !int]>}
     * }
     * @private
     */
    _argsToUseful(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        let di = roundWithDeadZone(args.endPos[0] - i - 0.5, 0.5, 2);
        let dj = roundWithDeadZone(args.endPos[1] - j - 0.5, 0.5, 2);
        if (Math.abs(di) > Math.abs(dj)) {
            dj = 0;
        } else {
            di = 0;
        }

        let startArea = args.surface.layout.holeFloodFill(i, j);
        let endArea = startArea.
            map(([x, y]) => [x + di, y + dj]).
            filter(([x, y]) => args.surface.layout.isInBounds(x, y));
        return {
            i,
            j,
            di,
            dj,
            startArea,
            endArea
        };
    }

    drawPreview(ctx, args) {
        let {startArea, endArea} = this._argsToUseful(args);

        ctx.fillStyle = '#800';
        for (let [i, j] of startArea) {
            ctx.fillRect(
                (i + 0.3) * config.diam + 0.5,
                (j + 0.3) * config.diam + 0.5,
                config.diam * 0.4,
                config.diam * 0.4);
        }

        ctx.fillStyle = config.holeColor;
        for (let [i, j] of endArea) {
            ctx.fillRect(i * config.diam + 0.5, j * config.diam + 0.5, config.diam, config.diam);
        }
    }

    applyEffect(args) {
        let i = Math.floor(args.startPos[0]);
        let j = Math.floor(args.startPos[1]);
        let di = roundWithDeadZone(args.endPos[0] - i - 0.5, 0.5, 2);
        let dj = roundWithDeadZone(args.endPos[1] - j - 0.5, 0.5, 2);
        let dMax = 0;
        if (Math.abs(di) > Math.abs(dj)) {
            dMax = Math.abs(di);
            di = Math.sign(di);
            dj = 0;
        } else {
            dMax = Math.abs(dj);
            dj = Math.sign(dj);
            di = 0;
        }

        let border = seq(args.surface.layout.holeFloodFill(i, j)).
            flatMap(([x, y]) => BorderLoc.allSides(x, y)).
            filter(loc => args.surface.layout.borderType(loc) !== undefined).
            filter(loc => loc.di * di + loc.dj * dj !== 0).
            groupBy(loc => loc.i*di + loc.j*dj);

        let keys = seq(border.keys()).sortedBy(e => -e).toArray();
        for (let key of keys) {
            for (let loc of border.get(key)) {
                if (loc.di === di && loc.dj === dj) {
                    let x = loc.i;
                    let y = loc.j;
                    for (let d = 1; d <= dMax; d += 2) {
                        if (!args.surface.extendPole(x + di * d, y + dj * d)) {
                            break;
                        }
                    }
                }
            }

            for (let loc of border.get(key)) {
                if (loc.di === di && loc.dj === dj) {
                    let x = loc.i;
                    let y = loc.j;
                    for (let d = 1; d <= dMax; d++) {
                        if (!args.surface.retractValley(x + di * d, y + dj * d)) {
                            break;
                        }
                    }
                }
            }

            for (let loc of border.get(key)) {
                if (loc.di === -di && loc.dj === -dj) {
                    let x = loc.i;
                    let y = loc.j;
                    for (let d = 0; d < dMax; d++) {
                        if (!args.surface.growValley(x + di * d, y + dj * d)) {
                            break;
                        }
                    }
                }
            }

            for (let loc of border.get(key)) {
                if (loc.di === -di && loc.dj === -dj) {
                    let x = loc.i;
                    let y = loc.j;
                    for (let d = 0; d < dMax; d += 2) {
                        if (!args.surface.retractPole(x + di * d, y + dj * d)) {
                            break;
                        }
                    }
                }
            }
        }
    }
}

let HoleDragger = new HoleDraggerType();

export {HoleDragger}
