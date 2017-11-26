from typing import Union, Optional
from idpression import Idpression, Uniform, Byte, Bit, Int32, Vec2, UInt32
from tex import Tex
from shader import X, Y, generate_shader_construction


def single_x() -> Idpression:
    state = Tex(name='state', val_type=Bit)
    target = Uniform(name='target', val_type=Int32)
    # Flip const bit of Z observable and Y sign bit.
    flip = (X < 2) & (Y == target * 2 + X)
    result = state != flip
    return generate_shader_construction(
        'singleX',
        result)


def do_parallel_hadamards(src: Idpression,
                          unaffected: Union[bool, Idpression]) -> Idpression:
    unaffected = Idpression.wrap(unaffected)
    return (unaffected.if_then(src)  # Unaffected.
            .else_if((X == 0) & ((Y & 1) == 0)).then(~src)  # Flip Y sign,
            .else_end(src[X, Y ^ 1]))  # Swap X/Z observables.


def single_hadamard():
    state = Tex(name='state', val_type=Bit)
    target = Uniform(name='target', val_type=Int32)
    result = do_parallel_hadamards(state, unaffected=(Y >> 1) != target)
    return generate_shader_construction(
        'singleHadamard',
        result)


def do_parallel_czs(state: Idpression,
                    affected: Union[bool, Idpression],
                    partner: Union[int, Idpression]) -> Idpression:
    is_affected = (X > 0) & (Y & 1 == 0) & affected
    flip = state[:, partner * 2 + 1] & is_affected
    return state ^ flip


def single_cz() -> Idpression:
    state = Tex(name='state', val_type=Bit)
    target1 = Uniform(name='target1', val_type=Int32)
    target2 = Uniform(name='target2', val_type=Int32)
    index = Y >> 1
    result = do_parallel_czs(state,
                             affected=(index == target1) | (index == target2),
                             partner=(target1 + target2 - index))
    return generate_shader_construction('singleCZ', result)


def find_one_fold():
    state = Tex(name='state', val_type=Int32)
    a = state[::2, :]
    b = state[1::2, :]
    result = ((a != 0).if_then(a + X)
              .else_if(b != 0).then(b + X + 1)
              .else_end(0))
    return generate_shader_construction(
        'findOneFold',
        result)


def or_fold():
    state = Tex(name='state', val_type=Bit)
    result = state[::2, :] | state[1::2, :]
    return generate_shader_construction(
        'orFold',
        result)


def shifter():
    state = Tex(name='state', val_type=Int32)
    offset = Uniform(name='offset', val_type=Vec2)
    read_x = X - offset.x().int()
    read_y = Y - offset.y().int()
    in_bounds = ((read_x >= 0) &
                 (read_y >= 0) &
                 (read_x < state.size.x().int()) &
                 (read_y < state.size.y().int()))
    result = in_bounds.if_then(state[read_x, read_y]).else_end(0)
    return generate_shader_construction(
        'shifter',
        result)


def prepare_clean_state():
    result = X*2 == Y + 4
    return generate_shader_construction(
        'prepareCleanState',
        result)


def bit_to_int():
    state = Tex(name='state', val_type=Bit)
    result = state.bool().int()
    return generate_shader_construction(
        'bitToInt',
        result)


def eliminate_column():
    """
    The input state should be the result of set_measured, with the target row
    having been flipped to have unit product. The measurement result is stored
    in the first cell of the target row (which is otherwise unused).

    The found_ones param should be the result of folding found_ones over all
    but the first two columns of the input state, so it has a single column
    containing zero to mean "no variables" or non-zero to mean "index of
    first variable" (off by one).

    The output state is the state after reset-ing the measurement, without
    removing the measurement results themselves. In the "no variable" case this
    means nothing happens. In the "yes variables" case, the Z observable's row
    (skipping first element) is xor'd into any rows who have a bit set at the
    same position as the Z observable's first variable bit that's set. Also the
    X observable will be replaced such that only the first variable bit from
    the Z observable is set.
    """
    state = Tex(name='state', val_type=Bit)
    mux = Tex(name='found_ones', val_type=Int32)
    measured = Uniform(name='target', val_type=Int32)

    unit_row = measured*2 + 1
    victim_col = mux[0, unit_row] + 1
    is_non_trivial = victim_col >= 2
    toggles = (state[:, unit_row] &
               state[victim_col, :] &
               is_non_trivial &
               (X > 0))
    reset = (Y == measured*2) & is_non_trivial
    result = reset.if_then(X == victim_col).else_end(toggles ^ state)
    return generate_shader_construction('eliminateCol', result)


def random_advance():
    state = Tex(name='state', val_type=UInt32)
    x1 = state[0, :]
    x2 = state[1, :]
    x3 = state[2, :]
    x4 = state[3, :]
    u = x1 | (x2 << 8) | (x3 << 16) | (x4 << 24)

    # xorshift32 prng
    u ^= u << 13
    u &= 0xFFFFFFFF
    u ^= u >> 17
    u ^= u << 5

    result = (u >> (X*8)) & 0xFF
    return generate_shader_construction('randomAdvance', result)


def measure_set_result():
    """
    The input state should be the state to be measured.

    The found_ones param should be the result of folding found_ones over all
    but the first two columns of the input state, so it has a single column
    containing zero to mean "no variables" or non-zero to mean "index of
    first variable" (off by one).

    The rand param should be a 4xH texture containing PRNG state. Its state
    should be advanced (separately) after using this shader.

    In the output state, the target qubit's Z observable is guaranteed to be
    equal to 1. The actual measurement result is stored in column 0 of Z. No
    other values should be affected.
    """
    state = Tex(name='state', val_type=Bit)
    found_ones = Tex(name='found_ones', val_type=Int32)
    rand = Tex(name='rand', val_type=Int32)
    target = Uniform(name='target', val_type=Int32)
    rand_bit = (rand[0, :] & 1).bool()
    const_bit = state[1, :]
    is_random_result = found_ones[0, :] != 0
    outcome = is_random_result.if_then(rand_bit).else_end(const_bit)

    not_affected = (Y != target*2 + 1) | (X >= 2)
    result = (not_affected.if_then(state)
              .else_if(X == 1).then(state ^ outcome)
              .else_end(outcome))
    return generate_shader_construction('measureSetResult', result)


def surface_hadamards(check_vs_data: Optional[bool]):
    state = Tex(name='state', val_type=Bit)
    surface_width = Uniform(Int32, 'surface_width')
    q = Y >> 1
    qX = q % surface_width
    qY = q // surface_width
    is_check = qX & 1 == qY & 1
    is_data = qX & 1 != qY & 1
    result = do_parallel_hadamards(
        state,
        False if check_vs_data is None else
        is_data if check_vs_data else
        is_check)
    caption = ('hadamardAll' if check_vs_data is None else
               'hadamardCheck' if check_vs_data else
               'hadamardData')
    return generate_shader_construction(caption, result)


def do_surface_czs(evens, verticals, zs):
    # o==x--o==x--
    #    |     |
    # z  o  z  o
    #    !     !
    # o==x--o==x==
    #    |     |
    # z  o  z  o
    #
    # =: even horizontal
    # -: odd horizontal
    # |: even vertical
    # !: odd vertical

    state = Tex(name='state', val_type=Bit)
    surface_width = Uniform(Int32, 'surface_width')
    surface_height = Uniform(Int32, 'surface_height')
    q = Y >> 1
    qX = q % surface_width
    qY = q // surface_width

    if verticals:
        i, j = qY, qX
        r = surface_height
    else:
        i, j = qX, qY
        r = surface_width
    offset = 0 if evens else 1

    on_line = (j & 1) == (1 if zs == verticals else 0)
    in_range = ((i + offset) | 1) - offset < r
    i = ((i + offset) ^ 1) - offset

    if verticals:
        qY, qX = i, j
    else:
        qX, qY = i, j

    result = do_parallel_czs(state,
                             affected=in_range & on_line,
                             partner=qY * surface_width + qX)
    captions = {
        (False, False, False): 'surfaceCzsEHX',
        (True, False, False): 'surfaceCzsOHX',
        (False, True, False): 'surfaceCzsEVX',
        (True, True, False): 'surfaceCzsOVX',
        (False, False, True): 'surfaceCzsEHZ',
        (True, False, True): 'surfaceCzsOHZ',
        (False, True, True): 'surfaceCzsEVZ',
        (True, True, True): 'surfaceCzsOVZ',
    }
    return generate_shader_construction(
        captions[(evens, verticals, zs)],
        result)


def apply_cycle(src):
    qX = (Y >> 1) & 15
    qY = (Y >> 5) & 15
    is_check = qX & 1 == qY & 1
    is_data = qX & 1 != qY & 1
    is_odd = qY & 1

    src[:, :] = do_parallel_hadamards(src, unaffected=False)
    src[:, :] = do_parallel_czs(src,
                                affected=(qX > 0) & ((qY & 1) == 1),
                                partner=(qX ^ 1) + (qY << 4))
    src[:, :] = do_parallel_czs(src,
                                affected=(qY > 0) & ((qX & 1) == 1),
                                partner=qX + ((qY ^ 1) << 4))
    src[:, :] = do_parallel_hadamards(src, unaffected=is_check)

    src[:, :] = do_parallel_czs(src,
                                affected=(qX < 16) & ((qY & 1) == 0),
                                partner=(qX ^ 1) + (qY << 4))
    src[:, :] = do_parallel_czs(src,
                                affected=(qX > 0) & ((qY & 1) == 1),
                                partner=(qX ^ 1) + (qY << 4))

    src[:, :] = do_parallel_hadamards(src, unaffected=is_data)

    # if is_check:
    #
    #     cnot_from(qX-1, qY)
    #     cnot_from(qX+1, qY)
    #     cnot_from(qX, qY-1)
    #     cnot_from(qX, qY+1)
    #
    # if i & 1 == 1 and j & 1 == 1:
    #     for p in [(i-1,j), (i+1, j), (i, j-1), (i, j+1)]:
    #         if p in qs:
    #             c.cnot(qs[p], q)
    #     cs[(i, j)] = c.measure(q, reset=True)
    #
    # if i & 1 == 0 and j & 1 == 0:
    #     for p in [(i-1,j), (i+1, j), (i, j-1), (i, j+1)]:
    #         if p in qs:
    #             c.xnot(qs[p], q)
    #     cs[(i, j)] = c.measure(q, reset=True)


def main():
    # print(or_fold())
    # print(find_one_fold())
    # print(single_x())
    # print(single_hadamard())
    # print(single_cz())
    # print(prepare_clean_state())
    # print(eliminate_column())
    # print(eliminate_column())
    # print(random_advance())
    # print(measure_set_result())
    # print(shifter())
    # print(surface_hadamards(check_vs_data=False))
    print(do_surface_czs(evens=False, verticals=True, zs=True))


main()
