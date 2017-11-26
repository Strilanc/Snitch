import {TexPair} from 'src/sim/Gpu.js'
import {bitToInt} from 'src/gen/bitToInt.js'
import {randomAdvance} from 'src/gen/randomAdvance.js'
import {eliminateCol} from 'src/gen/eliminateCol.js'
import {shifter} from 'src/gen/shifter.js'
import {measureSetResult} from 'src/gen/measureSetResult.js'
import {findOneFold} from 'src/gen/findOneFold.js'

/**
 * @param {!int} h
 * @returns {!TexPair}
 */
function createPrng(h) {
    let rng_seed = new Uint8Array(4 * h);
    for (let i = 0; i < rng_seed.length; i++) {
        rng_seed[i] = Math.floor(Math.random() * 256);
    }
    return new TexPair(4, h, rng_seed);
}

/**
 * @param {!TexPair} rngState
 */
function advancePrng(rngState) {
    randomAdvance.withArgs(rngState).renderInto(rngState);
}

/**
 * @param {!TexPair} sim_state
 * @param {!TexPair} fold_state
 * @param {!TexPair} rand_state
 * @param {!int} target
 */
function advanceMeasureWithReset(sim_state, fold_state, rand_state, target) {
    shifter.withArgs([-2, 0], sim_state.src).renderInto(fold_state);
    bitToInt.withArgs(fold_state).renderInto(fold_state);

    let w = Math.ceil(sim_state.src.width - 2);
    while (w > 1) {
        findOneFold.withArgs(fold_state.src).renderInto(fold_state);
        w = Math.ceil(w / 2);
    }

    measureSetResult.withArgs(target, fold_state, rand_state, sim_state).renderInto(sim_state);
    advancePrng(rand_state);

    eliminateCol.withArgs(target, fold_state, sim_state).renderInto(sim_state);
}

export {createPrng, advancePrng, advanceMeasureWithReset}
