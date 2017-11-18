import {GpuSuite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {assertShaderOutputs, assertTextureReads, texture_diagram} from "test/GpuTestUtil.js"

import {TexPair} from 'src/sim/Gpu.js'
import {createPrng, advancePrng, advanceMeasureWithReset} from 'src/sim/Operations.js'

let suite = new GpuSuite('operations');

suite.test('createPrng-distinction', () => {
    let prng = createPrng(30);
    let seed = prng.read();
    let seen = new Set();
    for (let e of seed) {
        seen.add(e);
    }
    assertThat(seen.size).isGreaterThan(50);

    advancePrng(prng);
    let next = prng.read();
    let same = 0;
    for (let i = 0; i < seed.length; i++) {
        if (seed[i] === next[i]) {
            same += 1;
        }
    }
});

suite.test('advancePrng-agreement-between-states', () => {
    let prng = createPrng(2048);
    let seed = prng.read();
    advancePrng(prng);
    let next = prng.read();
    let same = 0;
    for (let i = 0; i < seed.length; i++) {
        if (seed[i] === next[i]) {
            same += 1;
        }
    }
    assertThat(same).isGreaterThan(10);
    assertThat(same).isLessThan(50);
});

suite.test('advanceMeasureWithReset-random-toggle', () => {
    let state = texture_diagram(
        ' #   #  # ',
        '     ###  ',
        '    #  #  ',
        '##   ##   ',
        '    # #   ',
        '##########',
        '          ',
        '    #  #  ');
    let fold = new TexPair(state.src.width, state.src.height);
    let rng = texture_diagram(
        '    ',
        '    ',
        '    ',
        '1   ',
        '    ',
        '    ',
        '    ',
        '    ');
    advanceMeasureWithReset(state, fold, rng, 1);

    assertTextureReads(fold,
        '4         ',
        '4         ',
        '3         ',
        '4         ',
        '3         ',
        '1         ',
        '          ',
        '3         ');
    assertTextureReads(rng,
        '    ',
        '    ',
        '    ',
        [33, 32, 4, 0],
        '    ',
        '    ',
        '    ',
        '    ');
    assertTextureReads(state,
        ' #    # # ',
        '       #  ',
        '     #    ',
        '#         ',
        '    # #   ',
        '#####  ###',
        '          ',
        '    #  #  ');
});

suite.test('advanceMeasureWithReset-random-no-toggle', () => {
    let rng = texture_diagram(
        '    ',
        '    ',
        '    ',
        '2   ',
        '    ',
        '    ',
        '    ',
        '    ');
    let state = texture_diagram(
        ' #   #  # ',
        '     ###  ',
        '    #  #  ',
        ' #   ##   ',
        '    # #   ',
        ' #########',
        '          ',
        '    #  #  ');
    let fold = new TexPair(state.src.width, state.src.height);
    advanceMeasureWithReset(state, fold, rng, 1);

    assertTextureReads(state,
        '      # # ',
        ' #     #  ',
        '     #    ',
        '          ',
        '    # #   ',
        '  ###  ###',
        '          ',
        '    #  #  ');
});

suite.test('advanceMeasureWithReset-implied-false', () => {
    let state = texture_diagram(
        '# #  #   #',
        '          ',
        ' #########',
        ' # # # # #',
        '  # # # # ',
        ' ## ##   #',
        '     #### ',
        '    #  #  ');
    let fold = new TexPair(state.src.width, state.src.height);
    let rng = createPrng(state.src.height);
    advanceMeasureWithReset(state, fold, rng, 0);

    assertTextureReads(state,
        '# #  #   #',
        '          ',
        ' #########',
        ' # # # # #',
        '  # # # # ',
        ' ## ##   #',
        '     #### ',
        '    #  #  ');
});

suite.test('advanceMeasureWithReset-implied-true', () => {
    let state = texture_diagram(
        '## # #   #',
        ' #        ',
        ' #########',
        ' # # # # #',
        '  # # # # ',
        ' ## ##   #',
        '     #### ',
        '    #  #  ');
    let fold = new TexPair(state.src.width, state.src.height);
    let rng = createPrng(state.src.height);
    advanceMeasureWithReset(state, fold, rng, 0);

    assertTextureReads(state,
        '## # #   #',
        '#         ',
        ' #########',
        ' # # # # #',
        '  # # # # ',
        ' ## ##   #',
        '     #### ',
        '    #  #  ');
});
