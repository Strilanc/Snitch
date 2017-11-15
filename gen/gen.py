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


def apply_cz() -> Idpression:
    tex = Tex()
    target1 = Uniform('int', 'target1')
    target2 = Uniform('int', 'target2')

    prev = tex > 0.5
    other_index = (target1 + target2) * 2 - Y + 1
    other_val = tex[:, other_index] > 0.5
    is_target_x_obs = (Y == target1 * 2) | (Y == target2 * 2)
    flip = other_val & is_target_x_obs & (X > 0)
    return prev != flip


def apply_x() -> Idpression:
    tex = Tex(name='state')
    target = Uniform('int', '1i', False, 'target', add_id_suffix_to_name=False)
    # Flip const bit of Z observable and Y sign bit.
    flip = (X < 2) & (Y == target * 2 + X)
    result = tex ^ flip
    return generate_shader_construction(
        'applyXOperationShader',
        result)


def apply_h() -> Idpression:
    state = Tex(name='state')
    target = Uniform('int', '1i', False, 'target', add_id_suffix_to_name=False)
    result = (((Y >> 1) != target).if_then(state)  # do nothing
              .else_if((X == 0) & ((Y & 1) == 0)).then(~state)  # flip sign bit
              .else_end(state[X, Y ^ 1]))  # swap row pair
    return generate_shader_construction(
        'singleHadamard',
        result)


def apply_hadamards(src: Idpression, affected: Union[bool, Idpression]) -> Idpression:
    affected = Idpression.wrap(affected)
    return ((~affected).if_then(src)
            .else_if(X == Y & 1).then(~src)
            .else_end(src[X, Y ^ 1]))


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


def apply_czs(src: Idpression,
              affected: Union[bool, Idpression],
              partner: Union[int, Idpression]) -> Idpression:
    is_affected_x_data = (X > 0) & (Y & 1 == 0) & affected
    return (
        is_affected_x_data.if_then(src ^ src[X, partner*2 + 1])
        .else_end(src)
    )


def apply_cycle(src):
    qX = (Y >> 1) & 15
    qY = (Y >> 5) & 15
    is_check = qX & 1 == qY & 1
    is_data = qX & 1 != qY & 1
    is_odd = qY & 1

    src[:, :] = apply_hadamards(src, affected=True)
    src[:, :] = apply_czs(src,
                          affected=(qX > 0) & ((qY & 1) == 1),
                          partner=(qX ^ 1) + (qY << 4))
    src[:, :] = apply_czs(src,
                          affected=(qY > 0) & ((qX & 1) == 1),
                          partner=qX + ((qY ^ 1) << 4))
    src[:, :] = apply_hadamards(src, affected=is_data)

    src[:, :] = apply_czs(src,
                          affected=(qX < 16) & ((qY & 1) == 0),
                          partner=(qX ^ 1) + (qY << 4))
    src[:, :] = apply_czs(src,
                          affected=(qX > 0) & ((qY & 1) == 1),
                          partner=(qX ^ 1) + (qY << 4))

    src[:, :] = apply_hadamards(src, affected=is_check)

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
    # print()
    # print("X")
    # print(generate_shader(apply_x()))
    # print()
    # print("CZ")
    # print(generate_shader(apply_cz()))
    # print()
    # print("find one")
    # print(generate_shader(apply_find_one()))
    # print()
    # print("apply_or")
    print(find_one_fold())
    print(apply_x())
    print(apply_h())
    # print()
    # print()
    # print("assign")

    # steps = []
    # tex = Tex(steps)
    # apply_cycle(tex)
    # for s in steps:
    #     print(generate_shader(s.src))
    #     print(s.generate_js())


main()
