from typing import Union
from idpression import Idpression, Uniform, Byte, Bit, Int32, Vec2
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
    is_affected_x_data = (X > 0) & (Y & 1 == 0) & affected
    return (
        is_affected_x_data.if_then(state != state[X, partner * 2 + 1])
            .else_end(state)
    )


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
    result = state[X - offset.x().int(), Y - offset.y().int()]
    return generate_shader_construction(
        'shifter',
        result)


def prepare_clean_state():
    result = ((X*2 == Y + 4).if_then(255)
              .else_if((X == 0) & ((Y & 1) == 1)).then(127)
              .else_end(0))
    return generate_shader_construction(
        'prepareCleanState',
        result)


def eliminate_column():
    state = Tex(name='state', val_type=Bit)
    mux = Tex(name='found_ones', val_type=Int32)
    measured = Uniform(name='target', val_type=Int32)

    unit_row = measured*2 + 1
    victim_col = mux[2, unit_row] + 1
    toggles = state[:, unit_row] & state[victim_col, :] & (victim_col >= 2)
    result = toggles ^ state
    return generate_shader_construction('eliminateCol', result)


def random_advance():
    state = Tex(name='state', val_type=Int32)
    x1 = state[0, :]
    x2 = state[1, :]
    x3 = state[2, :]
    x4 = state[3, :]
    u = x1 | (x2 << 8) | (x3 << 16) | (x4 << 24)

    # xorshift32 prng
    u ^= u << 13
    u ^= u >> 17
    u ^= u << 5

    result = u >> (X*8)
    return generate_shader_construction('randomAdvance', result)


def measure_set_result():
    state = Tex(name='state', val_type=Bit)
    mux = Tex(name='found_ones', val_type=Int32)
    rand = Tex(name='rand', val_type=Int32)
    target = Uniform(name='target', val_type=Int32)
    rand_bit = (rand[0, :] & 1).bool()
    is_random_result = mux[2, :] != 0
    toggle = is_random_result & rand_bit & (Y == target*2 + 1) & (X == 1)
    result = state != toggle
    return generate_shader_construction('measureSetResult', result)


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
    print(random_advance())
    # print(measure_set_result())
    # print(shifter())


main()
