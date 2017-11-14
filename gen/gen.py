import re
import random
import numpy as np

from typing import Set, Tuple, Union, Dict, FrozenSet, List

_next_id = 0


def next_id():
    global _next_id
    _next_id += 1
    return _next_id - 1


class RawNamedValue(object):
    __hash__ = object.__hash__

    def __init__(self, dependencies: List['RawNamedValue'], uniform_dependencies: List['RawNamedValue'] = ()):
        self.dependencies = dependencies
        self.uniform_dependencies = uniform_dependencies

    def var_name(self):
        raise NotImplementedError()

    def __or__(self, other):
        return BinaryOp(self, other, 'bitwise_or', '|')

    def __and__(self, other):
        return BinaryOp(self, other, 'bitwise_and', '&')

    def __xor__(self, other):
        return BinaryOp(self, other, 'bitwise_xor', '^')

    def __lshift__(self, other):
        return BinaryOp(self, other, 'left_shift', '<<')

    def __rshift__(self, other):
        return BinaryOp(self, other, 'right_shift', '>>')

    def __add__(self, other):
        return BinaryOp(self, other, 'add', '+')

    def __radd__(self, other):
        return BinaryOp(other, self, 'add', '+')

    def __eq__(self, other):
        return BinaryOp(self, other, 'eq', '==')

    def __ne__(self, other):
        return BinaryOp(self, other, 'ne', '!=')

    def __gt__(self, other):
        return BinaryOp(self, other, 'gt', '>')

    def __ge__(self, other):
        return BinaryOp(self, other, 'ge', '>=')

    def __le__(self, other):
        return BinaryOp(self, other, 'le', '<=')

    def __lt__(self, other):
        return BinaryOp(self, other, 'lt', '<')

    def __sub__(self, other):
        return BinaryOp(self, other, 'sub', '-')

    def __rsub__(self, other):
        return BinaryOp(other, self, 'sub', '-')

    def __mul__(self, other):
        return BinaryOp(self, other, 'mul', '*')

    def __rmul__(self, other):
        return BinaryOp(other, self, 'mul', '*')

    def uniform_lines(self):
        return []

    def generate_init(self):
        return ''


class NamedValue(RawNamedValue):
    def __init__(self, name_prefix: str, dependencies: List[RawNamedValue], uniform_dependencies: List[RawNamedValue] = ()):
        super().__init__(dependencies, uniform_dependencies)
        self.name_prefix = name_prefix
        self.id = next_id()

    def __getitem__(self, item):
        x_slice, y_slice = item
        return PseudoSlice(self, x_slice, y_slice)

    def var_name(self):
        # return 'v{}'.format(self.id)
        return '{}_{}'.format(self.name_prefix, self.id)


def coalesce_slice(s: Union[slice, RawNamedValue, int], replace_point: bool) -> slice:
    if isinstance(s, (int, RawNamedValue)):
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


class TexSlice(NamedValue):
    def __init__(self, tex: 'TextureVector', x_slice: slice, y_slice: slice):
        super().__init__('slice', [tex.size] + slice_deps(x_slice) + slice_deps(y_slice), [tex])
        self.tex = tex
        self.x_slice = x_slice
        self.y_slice = y_slice

    def __getitem__(self, item):
        x_slice, y_slice = item
        return TexSlice(
            self.tex,
            nest_slice(self.x_slice, x_slice),
            nest_slice(self.y_slice, y_slice))

    def generate_init(self):
        line = 'int {} = int(texture({}, vec2({}) / {}).x * 255.0 + 0.5);'
        return line.format(
            self.var_name(),
            self.tex.tex_name(),
            slices_to_indexing([self.x_slice, self.y_slice], ['x', 'y']),
            self.tex.size.var_name())


def slice_deps(s):
    result = []
    if isinstance(s, RawNamedValue):
        result.append(s)
    elif isinstance(s, slice):
        result.append(s.step)
        result.append(s.stop)
        result.append(s.start)
    else:
        raise NotImplementedError()
    return [r for r in result if isinstance(r, RawNamedValue)]


class PseudoSlice(NamedValue):
    def __init__(self, val: NamedValue, x_slice: slice, y_slice: slice):
        deps = [dep[x_slice, y_slice] for dep in val.dependencies] + slice_deps(x_slice) + slice_deps(y_slice)
        super().__init__('slice', deps)
        self.val = val
        self.x_slice = x_slice
        self.y_slice = y_slice
        self.sliced_deps = deps

    def generate_init(self):
        line = self.val.generate_init()
        line = line.replace(self.val.var_name(), self.var_name())
        for dep, sliced_dep in zip(self.val.dependencies, self.sliced_deps):
            line = line.replace(dep.var_name(), sliced_dep.var_name())
        return line


class TextureVectorSize(NamedValue):
    def __init__(self):
        super().__init__('tex_size', [])

    def uniform_lines(self):
        return [
            'uniform vec2 {};'.format(self.var_name())
        ]

    def generate_init(self):
        return ''


class TextureVector(NamedValue):

    def __init__(self):
        self.size = TextureVectorSize()
        super().__init__('tex', [self.size])

    def uniform_lines(self):
        return [
            'uniform sampler2D {};'.format(self.tex_name()),
        ]

    def tex_name(self):
        return 'sampler_{}'.format(self.id)

    def generate_init(self):
        line = 'int {} = int(texture({}, gl_FragCoord.xy / {}).x * 255.0 + 0.5);'
        return line.format(
            self.var_name(),
            self.tex_name(),
            self.size.var_name())

    def __getitem__(self, item: Tuple[slice, slice]) -> TexSlice:
        x, y = item
        return TexSlice(self, x, y)


class Uniform(NamedValue):
    def __init__(self, type, name):
        super().__init__(name, [])
        self.type = type

    def __getitem__(self, item):
        return ValueError()

    def generate_init(self):
        return ''

    def uniform_lines(self):
        return [
            'uniform {} {};'.format(self.type, self.var_name()),
        ]


class Literal(RawNamedValue):
    def __init__(self, literal_text: str):
        super().__init__([])
        self.literal_text = literal_text

    def var_name(self):
        return self.literal_text

    def __getitem__(self, item):
        return ValueError()

    def generate_init(self):
        return ''

    def uniform_lines(self):
        return []


def wrap(x) -> RawNamedValue:
    if isinstance(x, RawNamedValue):
        return x
    if isinstance(x, (int, float)):
        return Literal(repr(x))
    if isinstance(x, bool):
        return Literal('true' if x else 'false')
    raise NotImplementedError()


class BinaryOp(NamedValue):
    def __init__(self, lhs, rhs, prefix, op_char):
        lhs = wrap(lhs)
        rhs = wrap(rhs)
        super().__init__(prefix, [lhs, rhs])
        self.lhs = lhs
        self.rhs = rhs
        self.op_char = op_char

    def generate_init(self):
        return 'int {} = int(({}) {} ({}));'.format(
            self.var_name(),
            self.lhs.var_name(),
            self.op_char,
            self.rhs.var_name())


def slices_to_indexing(slices, var_labels):
    if len(slices) != len(var_labels):
        raise NotImplementedError()
    return ', '.join('float({}) + 0.5'.format(slice_innards(s, c))
                     for s, c in zip(slices, var_labels))


def slice_innards(s, c='x'):
    def f(r):
        return wrap(r).var_name()

    if isinstance(s, int):
        return '{}'.format(s)

    if isinstance(s, slice):
        s = coalesce_slice(s, True)

        if s.start:
            if s.step != 1:
                return '{}*{} + {}'.format(c, f(s.step), f(s.start))
            return '{} + {}'.format(c, f(s.start))
        if s.step != 1:
            return '{}*{}'.format(c, f(s.step))
        return c

    if isinstance(s, RawNamedValue):
        return s.var_name()

    raise NotImplementedError(str(type(s)))


def compile(final_value: NamedValue):
    deps = []
    uniform_deps = []
    collect_ascending_deps(final_value, dict(), deps, False)
    collect_ascending_deps(final_value, dict(), uniform_deps, True)

    uniform_lines = []
    init_lines = []
    for dep in uniform_deps:
        uniform_lines.extend(dep.uniform_lines())
    for dep in deps:
        init_lines.append(dep.generate_init())

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
        }}""".format(uniform_block, init_block, final_value.var_name())

    return '\n'.join(code.split('\n        '))


def collect_ascending_deps(root: NamedValue,
                           seen: Dict[NamedValue, int],
                           out: List[NamedValue],
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


class Matcher(NamedValue):
    def __init__(self, *clauses):
        terms = []
        for a, b in clauses[:-1]:
            terms.append(a)
            terms.append(b)
        terms.append(clauses[-1])
        terms = [t for t in terms if isinstance(t, NamedValue)]
        super().__init__('match', terms)
        self.clauses = clauses

    def generate_init(self):
        lines = ["""
            int {};
            """.format(self.var_name())]
        for a, b in self.clauses[:-1]:
            lines.append("""if ({}) {{
                {} = {}
            }} else """.format(a.var_name(), self.var_name(), b.var_name()))
        lines.append("""{{
                {} = {}
            }}""".format(self.var_name(), self.clauses[-1]))
        return ''.join(lines)




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
