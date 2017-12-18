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
        return args.mouseButton === 0;
    }

    canHoverHint(args) {
        return true;
    }

    drawHoverHint(ctx, args) {
        let r = args.surface.layout.mouseSegmentToDataQubits(
            args.startPos[0], args.startPos[1], args.endPos[0], args.endPos[1]);
        let axis = r.pathType;
        let path = r.path;

        // ctx.fillStyle = '#800';
        // for (let [x, y] of r.anchorPoints) {
        //     ctx.fillRect((x - 0.2) * config.diam, (y - 0.2) * config.diam, config.diam * 0.4, config.diam * 0.4);
        // }

        ctx.strokeStyle = '#000';
        ctx.strokeRect((r.anchorPoints[0][0]-0.5)*config.diam, (r.anchorPoints[0][1]-0.5)*config.diam,
            config.diam, config.diam);

        ctx.beginPath();
        if (path === undefined) {
            ctx.moveTo(r.anchorPoints[0][0]*config.diam, r.anchorPoints[0][1]*config.diam);
            ctx.lineTo(r.anchorPoints[1][0]*config.diam, r.anchorPoints[1][1]*config.diam);
            ctx.strokeStyle = 'red';
            //noinspection JSUnresolvedFunction
            ctx.setLineDash([8, 4]);
            ctx.lineWidth = 4;

        } else {
            for (let [i, j] of path) {
                strokeErrorCurveAt(ctx, args.surface, i, j, axis);
            }
            ctx.strokeStyle = '#800';
            ctx.stroke();
            ctx.strokeStyle = axis.isZ() ? config.zOnColor : config.xOnColor;
            //noinspection JSUnresolvedFunction
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 3;
        }
        ctx.stroke();
    }

    drawPreview(ctx, args) {
        this.drawHoverHint(ctx, args);
    }

    applyEffect(args) {
        let r = args.surface.layout.mouseSegmentToDataQubits(
            args.startPos[0],
            args.startPos[1],
            args.endPos[0],
            args.endPos[1]);
        let flipAxis = r.pathType.opposite();
        let path = r.path;
        if (path !== undefined) {
            for (let [i, j] of path) {
                args.surface.errorOverlay.flipQubit(i, j, flipAxis);
            }
        }
    }
}

let ErrorPathMaker = new ErrorPathMakerType();

export {ErrorPathMaker}
