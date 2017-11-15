from idpression import Idpression, Literal


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
