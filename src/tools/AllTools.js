import {SquareHoleMaker} from 'src/tools/SquareHoleMaker.js'
import {SquareStabilizerFlipper} from 'src/tools/SquareStabilizerFlipper.js'
import {HoleDestroyer} from 'src/tools/HoleDestroyer.js'
import {ObservableStabilizerFlipper} from 'src/tools/ObservableStabilizerFlipper.js'
import {ObservableStabilizerCutter} from 'src/tools/ObservableStabilizerCutter.js'
import {HoleDragger} from 'src/tools/HoleDragger.js'
import {ErrorPathMaker} from 'src/tools/ErrorPathMaker.js'
import {StatePeeker} from 'src/tools/StatePeeker.js'
import {HoleResizer} from 'src/tools/HoleResizer.js'
import {HoleExtender} from 'src/tools/HoleExtender.js'
import {HoleRetracter} from 'src/tools/HoleRetracter.js'
import {HoleDragJoiner} from 'src/tools/HoleDragJoiner.js'
import {HoleJoiner} from 'src/tools/HoleJoiner.js'
import {HoleSplitter} from 'src/tools/HoleSplitter.js'
import {ValleyCloser} from 'src/tools/ValleyCloser.js'
import {ValleyOpener} from 'src/tools/ValleyOpener.js'

/** @type {!Array.<!Tool>} */
const ALL_TOOLS = [
    SquareHoleMaker,
    ErrorPathMaker,
    SquareStabilizerFlipper,
    HoleDragger,
    StatePeeker,
    HoleResizer,
    HoleExtender,
    HoleDragJoiner,
    HoleJoiner,
    HoleSplitter,
    HoleRetracter,
    ObservableStabilizerFlipper,
    ObservableStabilizerCutter,
    HoleDestroyer,
    ValleyCloser,
    ValleyOpener,
];

export {ALL_TOOLS}
