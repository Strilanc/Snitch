import {config} from "src/config.js";

class Sparkle {
    /**
     * @param {!number} startTime
     * @param {!number} duration
     * @param {!function(ctx: !CanvasRenderingContext2D, surface: !SurfaceCode, progress: !number) : void} drawer
     */
    constructor(startTime, duration, drawer) {
        this.startTime = startTime;
        this.duration = duration;
        this.drawer = drawer;
    }
}

class SurfaceCodeSparkles {
    /**
     * @param {!Array.<!Sparkle>} sparkles
     * @param {!number} time
     */
    constructor(sparkles=[], time=0) {
        this.sparkles = sparkles;
        this.time = time;
    }

    /**
     * @param {!number} dt
     */
    advanceTime(dt) {
        this.time += dt;
        this.sparkles = this.sparkles.filter(e => e.startTime + e.duration >= this.time);
    }
    /**
     * @returns {!SurfaceCodeSparkles}
     */
    clone() {
        return new SurfaceCodeSparkles(this.sparkles.map(e => e), this.time);
    }

    /**
     * @param {!number} duration
     * @param {!function(ctx: !CanvasRenderingContext2D, surface: !SurfaceCode, progress: !number) : void} drawer
     */
    play(duration, drawer) {
        this.sparkles.push(new Sparkle(this.time, duration, drawer));
    }

    /**
     * @param {!int} i
     * @param {!int} j
     * @param {!string} color
     * @param {!number} r
     * @param {!number} dt
     */
    bang(i, j, color, r=2, dt=1) {
        this.play(dt, (ctx, surface, progress) => {
            ctx.fillStyle = color;
            ctx.globalAlpha = 1 - progress;
            ctx.fillRect(
                (i+0.5-progress/2*r)*config.diam,
                (j+0.5-progress/2*r)*config.diam,
                config.diam*progress*r,
                config.diam*progress*r);
        });
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!SurfaceCode} surface
     */
    draw(ctx, surface) {
        for (let sparkle of this.sparkles) {
            let dt = this.time - sparkle.startTime;
            if (dt >= 0 && dt < sparkle.duration) {
                ctx.save();
                try {
                    sparkle.drawer(ctx, surface, dt / sparkle.duration);
                } finally {
                    ctx.restore();
                }
            }
        }
    }
}

export {Sparkle, SurfaceCodeSparkles}
