from typing import Tuple, Union, Dict, List
from idpression import Idpression, Literal, slice_deps, Uniform

_next_id = 0


def next_id():
    global _next_id
    _next_id += 1
    return _next_id - 1


def coalesce_slice(s: Union[slice, Idpression, int], replace_point: bool) -> slice:
    if isinstance(s, (int, Idpression)):
        if replace_point:
            return slice(s, None, 1)
        return s

    if s.stop is not None:
        raise NotImplementedError('stop')
    if s.step is not None and s.step < 1:
        raise ValueError('step')

    return slice(
        0 if s.start is None else s.start,
        s.stop,
        1 if s.step is None else s.step)


def nest_slice(s1: slice, s2: slice) -> slice:
    if not isinstance(s1, slice):
        raise ValueError('Not a slice.')
    s1 = coalesce_slice(s1, False)
    if isinstance(s2, slice):
        s2 = coalesce_slice(s2, True)
        return slice(s1.start + s1.step * s2.start, None, s1.step * s2.step)
    return s1.start + s2 * s1.step


class TexSlice(Idpression):
    def __init__(self, tex: 'TextureVector', x_slice: slice, y_slice: slice):
        super().__init__(
            'slice',
            [tex.size] + slice_deps(x_slice) + slice_deps(y_slice),
            [tex])
        self.tex = tex
        self.x_slice = x_slice
        self.y_slice = y_slice

    def __getitem__(self, item):
        x_slice, y_slice = item
        return TexSlice(
            self.tex,
            nest_slice(self.x_slice, x_slice),
            nest_slice(self.y_slice, y_slice))

    def formula(self):
        line = 'int(texture(({}), vec2({}) / ({})).x * 255.0 + 0.5)'
        return line.format(
            self.tex.tex_name(),
            slices_to_indexing([self.x_slice, self.y_slice], ['x', 'y']),
            self.tex.size.var_name)


class TextureVectorSize(Idpression):
    def __init__(self):
        super().__init__('tex_size', [])

    def uniform_lines(self):
        return [
            'uniform vec2 {};'.format(self.var_name)
        ]


class TextureVector(Idpression):

    def __init__(self):
        self.size = TextureVectorSize()
        super().__init__('tex', [self.size])

    def uniform_lines(self):
        return [
            'uniform sampler2D {};'.format(self.tex_name()),
        ]

    def tex_name(self):
        return 'sampler_{}'.format(self.var_name)

    def formula(self):
        line = 'int(texture({}, gl_FragCoord.xy / {}).x * 255.0 + 0.5)'
        return line.format(
            self.var_name,
            self.tex_name(),
            self.size.var_name)

    def __getitem__(self, item: Tuple[slice, slice]) -> TexSlice:
        x, y = item
        return TexSlice(self, x, y)


def slices_to_indexing(slices, var_labels):
    if len(slices) != len(var_labels):
        raise NotImplementedError()
    return ', '.join('float({}) + 0.5'.format(slice_innards(s, c))
                     for s, c in zip(slices, var_labels))


def slice_innards(s, c='x'):
    def f(r):
        return Idpression.wrap(r).var_name

    if isinstance(s, int):
        return '{}'.format(s)

    if isinstance(s, slice):
        s = coalesce_slice(s, True)

        if s.start:
            if s.step != 1:
                return '({})*({}) + ({})'.format(c, f(s.step), f(s.start))
            return '({}) + ({})'.format(c, f(s.start))
        if s.step != 1:
            return '({})*({})'.format(c, f(s.step))
        return c

    if isinstance(s, Idpression):
        return s.var_name

    raise NotImplementedError(str(type(s)))


def compile(final_value: Idpression):
    deps = []
    uniform_deps = []
    collect_ascending_deps(final_value, dict(), deps, False)
    collect_ascending_deps(final_value, dict(), uniform_deps, True)

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
            outColor = float({}) / 255.0;
        }}""".format(uniform_block, init_block, final_value.var_name)

    return '\n'.join(code.split('\n        '))


def collect_ascending_deps(root: Idpression,
                           seen: Dict[Idpression, int],
                           out: List[Idpression],
                           include_uniforms: bool):
    if root in seen:
        seen[root] += 1
        return
    seen[root] = 1

    for r in root.dependencies:
        collect_ascending_deps(r, seen, out, include_uniforms)
    if include_uniforms:
        for r in root.uniform_dependencies:
            collect_ascending_deps(r, seen, out, include_uniforms)
    out.append(root)


X = Literal('x')
Y = Literal('y')

def apply_cz():
    tex = TextureVector()
    target1 = Uniform('int', 'target1')
    target2 = Uniform('int', 'target2')

    prev = tex > 0.5
    other_index = (target1 + target2) * 2 - Y + 1
    other_val = tex[:, other_index] > 0.5
    is_target_x_obs = (Y == target1 * 2) | (Y == target2 * 2)
    flip = other_val & is_target_x_obs & (X > 0)
    return prev != flip


def apply_x():
    tex = TextureVector()
    target = Uniform('int', 'target')
    prev = tex > 0.5
    update_sign_y = (X == 0) & (Y == target * 2)
    update_sign_z = (X == 1) & (Y == target * 2 + 1)
    update = update_sign_y | update_sign_z
    return prev != update


class Matcher(Idpression):
    def __init__(self, *clauses):
        terms = []
        for a, b in clauses[:-1]:
            terms.append(a)
            terms.append(b)
        terms.append(clauses[-1])
        terms = [t for t in terms if isinstance(t, Idpression)]
        super().__init__('match', terms)
        self.clauses = clauses

    def formula(self):
        lines = ['']
        for a, b in self.clauses[:-1]:
            lines.append('({}) ? ({}) :'.format(
                Idpression.wrap(a).var_name,
                Idpression.wrap(b).var_name))
        lines.append('({})'.format(Idpression.wrap(self.clauses[-1]).var_name))
        return '\n                '.join(lines)


def apply_find_one():
    tex = TextureVector()
    a = tex[::2, :]
    b = tex[1::2, :]
    return Matcher(
        [a != 0, a + X],
        [b != 0, b + X + 1],
        0)


def apply_or():
    tex = TextureVector()
    return tex[::2, :] | tex[1::2, :]


def main():
    print()
    print("X")
    print(compile(apply_x()))
    print()
    print("CZ")
    print(compile(apply_cz()))
    print()
    print("find one")
    print(compile(apply_find_one()))
    print()
    print("apply_or")
    print(compile(apply_or()))


main()
