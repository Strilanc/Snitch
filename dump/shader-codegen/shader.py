from idpression import Idpression, Literal, Int32
import re


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
            init_lines.append('{} {} = {};'.format(
                dep.val_type.gl_name,
                dep.var_name,
                f))

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
            outColor = {};
        }}""".format(
            uniform_block,
            init_block,
            final_value.val_type.to_out(final_value.var_name))

    indented = '\n'.join(code.split('\n        '))
    cleaned = re.sub(r'([ \(*+\-!])\(([a-zA-Z_0-9]+)\)', r'\1\2', indented)

    return cleaned


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

X = Literal('x', val_type=Int32, python_equivalent=None)
Y = Literal('y', val_type=Int32, python_equivalent=None)
