from typing import Tuple, Union, Dict, List
from idpression import Idpression, Literal, slice_deps, Uniform, Matcher
from tex import Tex


def generate_shader(final_value: Idpression):
    deps = final_value.collect_ascending_deps(include_uniforms=False)
    uniform_deps = final_value.collect_ascending_deps(include_uniforms=True)

    uniform_lines = []
    init_lines = []
    for dep in uniform_deps:
        uniform_lines.extend(dep.uniform_lines())
    for dep in deps:
        f = dep.formula()
        if f is not None:
            init_lines.append('int {} = {};'.format(dep.var_name, f))

    uniform_block = '\n        '.join(line for line in uniform_lines if line)
    init_block = '\n            '.join(line for line in init_lines if line)

    code = """#version 300 es
        precision highp float;
        precision highp int;
        {}
        out float outColor;
        void main() {{
            int x = int(gl_FragCoord.x);
            int y = int(gl_FragCoord.y);
            {}
            outColor = float((({}) & 0xFF)) / 255.0;
        }}""".format(uniform_block, init_block, final_value.var_name)

    return '\n'.join(code.split('\n        '))


def generate_shader_construction(name: str,
                                 final_value: Idpression):
    shader_source = generate_shader(final_value).replace('\n', '\n    ')
    uniform_deps = final_value.collect_ascending_deps(include_uniforms=True)
    uniform_args = sorted([
        ',\n    ' + b
        for e in uniform_deps
        for b in e.uniform_args()
    ])
    return """////// AUTO-GENERATED CODE //////

import {{ParametrizedShader}} from 'src/sim/Gpu.js'

let {} = new ParametrizedShader(`{}`{});

export {{{}}}""".format(
        name,
        shader_source,
        ''.join(uniform_args),
        name)

X = Literal('x', None)
Y = Literal('y', None)


def apply_x() -> Idpression:
    tex = Tex(name='state')
    target = Uniform('int', '1i', False, 'target')
    # Flip const bit of Z observable and Y sign bit.
    flip = (X < 2) & (Y == target * 2 + X)
    result = tex ^ flip
    return generate_shader_construction(
        'applyXOperationShader',
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
        is_affected_x_data.if_then(state ^ state[X, partner*2 + 1])
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
    a = tex[::2, :]
    b = tex[1::2, :]
    result =  ((a != 0).if_then(a + X)
               .else_if(b != 0).then(b + X + 1)
               .else_end(0))
    return generate_shader_construction(
        'findOneFoldRowsShader',
        result)


def or_fold():
    tex = Tex(name='state')
    result = tex[-2::2, :] | tex[-1::2, :]
    return generate_shader_construction(
        'orFoldRowsShader',
        result)


def apply_cycle(src):
    qX = (Y >> 1) & 15
    qY = (Y >> 5) & 15
    is_check = qX & 1 == qY & 1
    is_data = qX & 1 != qY & 1
    is_odd = qY & 1

    src[:, :] = do_parallel_hadamards(src, affected=True)
    src[:, :] = do_parallel_czs(src,
                          affected=(qX > 0) & ((qY & 1) == 1),
                          partner=(qX ^ 1) + (qY << 4))
    src[:, :] = do_parallel_czs(src,
                          affected=(qY > 0) & ((qX & 1) == 1),
                          partner=qX + ((qY ^ 1) << 4))
    src[:, :] = do_parallel_hadamards(src, affected=is_data)

    src[:, :] = do_parallel_czs(src,
                          affected=(qX < 16) & ((qY & 1) == 0),
                          partner=(qX ^ 1) + (qY << 4))
    src[:, :] = do_parallel_czs(src,
                          affected=(qX > 0) & ((qY & 1) == 1),
                          partner=(qX ^ 1) + (qY << 4))

    src[:, :] = do_parallel_hadamards(src, affected=is_check)

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
    # print(find_one_fold())
    # print(apply_x())
    # print(single_hadamard())
    print(single_cz())


main()
