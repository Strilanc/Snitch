from typing import Union
from idpression import Idpression, Uniform
from tex import Tex
from shader import X, Y, generate_shader_construction


def single_x() -> Idpression:
    tex = Tex(name='state')
    target = Uniform('int', '1i', False, 'target')
    # Flip const bit of Z observable and Y sign bit.
    flip = (X < 2) & (Y == target * 2 + X)
    result = tex ^ flip
    return generate_shader_construction(
        'singleX',
        result)


def do_parallel_hadamards(src: Idpression,
                          unaffected: Union[bool, Idpression]) -> Idpression:
    unaffected = Idpression.wrap(unaffected)
    return (unaffected.if_then(src)  # Unaffected.
            .else_if((X == 0) & ((Y & 1) == 0)).then(~src)  # Flip Y sign,
            .else_end(src[X, Y ^ 1]))  # Swap X/Z observables.


def do_parallel_czs(state: Idpression,
                    affected: Union[bool, Idpression],
                    partner: Union[int, Idpression]) -> Idpression:
    is_affected_x_data = (X > 0) & (Y & 1 == 0) & affected
    return (
        is_affected_x_data.if_then(state ^ state[X, partner * 2 + 1])
            .else_end(state)
    )


def single_cz() -> Idpression:
    state = Tex(name='state')
    target1 = Uniform('int', '1i', False, 'target1')
    target2 = Uniform('int', '1i', False, 'target2')
    index = Y >> 1
    result = do_parallel_czs(state,
                             affected=(index == target1) | (index == target2),
                             partner=(target1 + target2 - index))
    return generate_shader_construction('singleCZ', result)


def find_one_fold():
    tex = Tex(name='state')
    a = tex[-2::2, :]
    b = tex[-1::2, :]
    result = ((a != 0).if_then(a + X)
              .else_if(b != 0).then(b + X + 1)
              .else_end(0))
    return generate_shader_construction(
        'findOneFold',
        result)


def or_fold():
    tex = Tex(name='state')
    result = tex[-2::2, :] | tex[-1::2, :]
    return generate_shader_construction(
        'orFold',
        result)


def prepare_clean_state():
    result = ((X*2 == Y + 4).if_then(255)
              .else_if((X == 0) & ((Y & 1) == 1)).then(127)
              .else_end(0))
    return generate_shader_construction(
        'prepareCleanState',
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
    print(find_one_fold())
    # print(single_x())
    # print(single_hadamard())
    # print(single_cz())
    # print(prepare_clean_state())


main()
