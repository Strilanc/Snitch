from typing import List, Optional, Union, Dict, Type, Tuple, Callable

_next_id = 0


def next_id():
    global _next_id
    _next_id += 1
    return _next_id - 1


class ShaderType(object):
    def __init__(self,
                 name: str,
                 gl_name: str,
                 set_arg_key: Optional[str] = None,
                 from_in: Optional[Callable[[str], str]] = None,
                 to_out: Optional[Callable[[str], str]] = None,
                 spread_args: bool = False):
        self.name = name
        self.gl_name = gl_name
        self.set_arg_key = set_arg_key
        self.from_in = from_in
        self._to_out = to_out
        self.spread_args = spread_args

    def to_out(self, expression: str) -> str:
        if self._to_out is None:
            raise ValueError('Not a convertible type: {}'.format(self))
        return self._to_out(expression)

    def __repr__(self):
        return 'ShaderType({})'.format(repr(self.name))

    def combine(self, other: 'ShaderType') -> 'ShaderType':
        if self is other:
            return self
        raise ValueError('Incompatible types: {} vs {}'.format(self, other))


Bit = ShaderType(
    name='Bit',
    gl_name='bool',
    set_arg_key='1i',
    from_in=lambda s: '({}).x > 0.5'.format(s),
    to_out=lambda s: 'float({})'.format(s))

Byte = ShaderType(
    name='Byte',
    gl_name='int',
    set_arg_key='1i',
    from_in=lambda s: 'int(({}).x*255.0 + 0.5)'.format(s),
    to_out=lambda s: 'float({}) / 255.0'.format(s))

Int32 = ShaderType(
    name='Int32',
    gl_name='int',
    set_arg_key='1i',
    from_in=lambda s: 'int(({}).x*255.0 + 0.5)'.format(s),
    to_out=lambda s: 'float({}) / 255.0'.format(s))

UInt32 = ShaderType(
    name='UInt32',
    gl_name='uint',
    set_arg_key='1i',
    from_in=lambda s: 'uint(({}).x*255.0 + 0.5)'.format(s),
    to_out=lambda s: 'float({}) / 255.0'.format(s))

Float32 = ShaderType(
    name='Float32',
    gl_name='float',
    set_arg_key='1f',
    from_in=lambda s: s,
    to_out=lambda s: s)

Vec2 = ShaderType(
    name='Vec2',
    gl_name='vec2',
    set_arg_key='2f',
    spread_args=True)


class Idpression(object):
    """
    An idempotent expression that can be stored in a named variable.
    """

    __hash__ = object.__hash__

    def __init__(self,
                 name: str,
                 val_type: ShaderType,
                 dependencies: List['Idpression'] = (),
                 uniform_dependencies: List['Idpression'] = (),
                 add_id_suffix_to_name=True):
        self.dependencies = dependencies
        self.val_type = val_type
        self.uniform_dependencies = uniform_dependencies
        self.var_name = ('{}_{}'.format(name, next_id())
                         if add_id_suffix_to_name
                         else name)

    def uniform_lines(self):
        return []

    def uniform_args(self):
        return []

    def collect_ascending_deps(self,
                               seen: Dict['Idpression', int] = None,
                               out: List['Idpression'] = None,
                               include_uniforms: bool = True):
        if seen is None:
            seen = dict()
        if out is None:
            out = []
        if self in seen:
            seen[self] += 1
            return out
        seen[self] = 1

        for r in self.dependencies:
            r.collect_ascending_deps(seen, out, include_uniforms)
        if include_uniforms:
            for r in self.uniform_dependencies:
                r.collect_ascending_deps(seen, out, include_uniforms)
        out.append(self)
        return out

    def formula(self) -> Optional[str]:
        """An expression for this value, or None if the var_name works fine."""
        return None

    def if_then(self, true_result) -> 'PartialMatcherBeforeElse':
        return PartialMatcherBeforeElse([[self, true_result]])

    def __or__(self, other):
        if self.val_type is Bit and other.val_type is Bit:
            return BinaryOp(self, other, 'bit_or', '||')
        return BinaryOp(self, other, 'bitwise_or', '|')

    def __and__(self, other):
        if self.val_type is Bit and other.val_type is Bit:
            return BinaryOp(self, other, 'bit_and', '&&')
        if self.val_type is UInt32 and isinstance(other, int):
            return self & Idpression.wrap(other).uint()
        return BinaryOp(self, other, 'bitwise_and', '&')

    def __floordiv__(self, other):
        if self.val_type is Int32 and other.val_type is Int32:
            return BinaryOp(self, other, 'divide', '/')
        return BinaryOp(self, other, 'divide', '/').int()

    def __mod__(self, other):
        if self.val_type is Float32 and other.val_type is Float32:
            return FuncOp('mod', Float32, self, other)
        return BinaryOp(self, other, 'mod', '%')

    def bool(self):
        return FuncOp('bool', Bit, self)

    def int(self):
        return FuncOp('int', Int32, self)

    def uint(self):
        return FuncOp('uint', UInt32, self)

    def float(self):
        return FuncOp('float', Float32, self)

    def __invert__(self):
        if self.val_type == Bit:
            return UnaryOp(self, 'not', '!')
        return UnaryOp(self, 'logical_neg', '~')

    def __neg__(self):
        return UnaryOp(self, 'neg', '-')

    def __xor__(self, other) -> 'Idpression':
        if self.val_type is Int32 and isinstance(other, int) and other == 0:
            return self
        if self.val_type is Bit and Idpression.wrap(other).val_type is Bit:
            return BinaryOp(self, other, 'bit_xor', '!=')
        return BinaryOp(self, other, 'bitwise_xor', '^')

    def __lshift__(self, other):
        if self.val_type is Int32 and isinstance(other, int) and other == 0:
            return self
        return BinaryOp(self, other, 'left_shift', '<<', self.val_type)

    def __rshift__(self, other):
        if self.val_type is Int32 and isinstance(other, int) and other == 0:
            return self
        return BinaryOp(self, other, 'right_shift', '>>', self.val_type)

    def __add__(self, other):
        if self.val_type is Int32 and isinstance(other, int) and other == 0:
            return self
        return BinaryOp(self, other, 'add', '+')

    def __radd__(self, other):
        if self.val_type is Int32 and isinstance(other, int) and other == 0:
            return self
        return BinaryOp(other, self, 'add', '+')

    def __eq__(self, other):
        return BinaryOp(self, other, 'eq', '==', out_type=Bit)

    def __ne__(self, other):
        return BinaryOp(self, other, 'ne', '!=', out_type=Bit)

    def __gt__(self, other):
        return BinaryOp(self, other, 'gt', '>', out_type=Bit)

    def __ge__(self, other):
        return BinaryOp(self, other, 'ge', '>=', out_type=Bit)

    def __le__(self, other):
        return BinaryOp(self, other, 'le', '<=', out_type=Bit)

    def __lt__(self, other):
        return BinaryOp(self, other, 'lt', '<', out_type=Bit)

    def __sub__(self, other):
        if self.val_type is Int32 and isinstance(other, int) and other == 0:
            return self
        return BinaryOp(self, other, 'sub', '-')

    def __rsub__(self, other):
        if self.val_type is Int32 and isinstance(other, int) and other == 0:
            return -self
        return BinaryOp(other, self, 'sub', '-')

    def __mul__(self, other):
        return BinaryOp(self, other, 'mul', '*')

    def __rmul__(self, other):
        return BinaryOp(other, self, 'mul', '*')

    def __getitem__(self, item):
        x_slice, y_slice = item
        return PseudoSlice(self, x_slice, y_slice)

    def x(self):
        if self.val_type is not Vec2:
            raise ValueError('Not a Vec2.')
        return PropertyOp(self, 'x', Float32)

    def y(self):
        if self.val_type is not Vec2:
            raise ValueError('Not a Vec2.')
        return PropertyOp(self, 'y', Float32)

    @staticmethod
    def wrap(val: Union[bool, int, float, 'Idpression']) -> 'Idpression':
        if isinstance(val, Idpression):
            return val
        if isinstance(val, bool):
            return Literal(literal_text='true' if val else 'false',
                           python_equivalent=-1 if val else 0,
                           val_type=Bit)
        if isinstance(val, int):
            return Literal(literal_text=repr(val),
                           val_type=Int32,
                           python_equivalent=val)
        if isinstance(val, float):
            return Literal(literal_text=repr(val),
                           val_type=Float32,
                           python_equivalent=val)
        raise ValueError('Unrecognized val: {}'.format(val))


class PartialMatcherBeforeElse(object):
    def __init__(self, clauses):
        self.clauses = clauses

    def else_if(self, condition) -> 'PartialMatcherBeforeThen':
        return PartialMatcherBeforeThen(self.clauses, condition)

    def else_end(self, result) -> Idpression:
        clauses, else_result = Matcher.simplify(self.clauses, result)
        if not clauses:
            return else_result
        return Matcher(clauses, else_result)


class PartialMatcherBeforeThen(object):
    def __init__(self, clauses, condition):
        self.condition = condition
        self.clauses = clauses

    def then(self, result) -> PartialMatcherBeforeElse:
        return PartialMatcherBeforeElse(
            self.clauses + [[self.condition, result]])


class Literal(Idpression):
    def __init__(self,
                 literal_text: str,
                 val_type: ShaderType,
                 python_equivalent):
        super().__init__(literal_text, val_type, add_id_suffix_to_name=False)
        self.python_equivalent = python_equivalent

    def __getitem__(self, item):
        return ValueError()

    def uniform_lines(self):
        return []

    def __invert__(self):
        if self.python_equivalent is None:
            return Idpression.__invert__(self)
        return Idpression.wrap(~self.python_equivalent)


class Uniform(Idpression):
    def __init__(self,
                 val_type: ShaderType,
                 name: str,
                 add_id_suffix_to_name=False):
        super().__init__(name,
                         val_type,
                         add_id_suffix_to_name=add_id_suffix_to_name)
        self.val_type = val_type

    def __getitem__(self, item):
        return ValueError()

    def uniform_lines(self):
        return [
            'uniform {} {};'.format(self.val_type.gl_name, self.var_name),
        ]

    def uniform_args(self):
        return [
            "['{}', '{}', {}]".format(
                self.val_type.set_arg_key,
                self.var_name,
                'true' if self.val_type.spread_args else 'false')
        ]


class UniformTexSize(Uniform):
    def __init__(self, name, add_id_suffix_to_name=True):
        super().__init__(Vec2,
                         name,
                         add_id_suffix_to_name=add_id_suffix_to_name)

    def uniform_args(self):
        # Handled by Tex.
        return []


class UnaryOp(Idpression):
    def __init__(self, val, prefix, op_char):
        val = Idpression.wrap(val)
        super().__init__(prefix, val.val_type, dependencies=[val])
        self.val = val
        self.op_char = op_char

    def formula(self):
        return '{}({})'.format(
            self.op_char,
            self.val.var_name)


class FuncOp(Idpression):
    def __init__(self, op_name: str, out_type: ShaderType, *vals: Idpression):
        vals = tuple(Idpression.wrap(val) for val in vals)
        super().__init__(
            name='func_{}'.format(op_name),
            val_type=out_type,
            dependencies=vals)
        self.vals = vals
        self.op_name = op_name

    def formula(self):
        return '{}({})'.format(
            self.op_name,
            ', '.join('({})'.format(e.var_name) for e in self.vals))


class PropertyOp(Idpression):
    def __init__(self, val: Idpression, prop_name: str, out_type: ShaderType):
        super().__init__(
            name='prop_{}'.format(prop_name),
            val_type=out_type,
            dependencies=[val])
        self.val = val
        self.prop_name = prop_name

    def formula(self):
        return '({}).{}'.format(
            self.val.var_name,
            self.prop_name)


class BinaryOp(Idpression):
    def __init__(self,
                 lhs: Idpression,
                 rhs: Idpression,
                 prefix: str,
                 op_char: str,
                 out_type: Optional[ShaderType] = None):
        lhs = Idpression.wrap(lhs)
        rhs = Idpression.wrap(rhs)
        super().__init__(
            prefix,
            val_type=out_type or lhs.val_type.combine(rhs.val_type),
            dependencies=[lhs, rhs])
        self.lhs = lhs
        self.rhs = rhs
        self.op_char = op_char

    def formula(self):
        return '({}) {} ({})'.format(
            self.lhs.var_name,
            self.op_char,
            self.rhs.var_name)


class PseudoSlice(Idpression):
    def __init__(self, val: Idpression, x_slice: slice, y_slice: slice):
        deps = ([dep[x_slice, y_slice] for dep in val.dependencies] +
                slice_deps(x_slice) +
                slice_deps(y_slice))
        super().__init__('slice', val.val_type, deps)
        self.val = val
        self.x_slice = x_slice
        self.y_slice = y_slice
        self.sliced_deps = deps

    def formula(self):
        line = self.val.formula()
        for dep, sliced_dep in zip(self.val.dependencies, self.sliced_deps):
            # Oh man is this ever hacky.
            line = line.replace(dep.var_name, sliced_dep.var_name)
        return line


class Matcher(Idpression):
    def __init__(self,
                 clauses: List[Tuple[Idpression, Idpression]],
                 else_result: Idpression):
        terms = []
        combo_type = Idpression.wrap(else_result).val_type
        for a, b in clauses:
            terms.append(a)
            terms.append(b)
            combo_type = combo_type.combine(Idpression.wrap(b).val_type)
        terms.append(else_result)
        terms = [t for t in terms if isinstance(t, Idpression)]

        super().__init__('match', combo_type, terms)
        self.clauses = clauses
        self.else_result = else_result

    @staticmethod
    def simplify(clauses, else_result):
        result = []
        for i in range(len(clauses)):
            if (isinstance(clauses[i][0], Literal) and
                    clauses[i][0].python_equivalent is not None):
                if clauses[i][0].python_equivalent:
                    return clauses[:i], clauses[i][1]
                continue
            result.append(clauses[i])

        return result, else_result

    def formula(self):
        lines = ['']
        for a, b in self.clauses:
            aw = Idpression.wrap(a)
            if aw.val_type is not Bit:
                raise ValueError('Not a bool: {}'.format(aw))
            lines.append('({}) ? ({}) :'.format(
                aw.var_name,
                Idpression.wrap(b).var_name))
        lines.append('({})'.format(Idpression.wrap(self.else_result).var_name))
        return '\n                '.join(lines)


def slice_deps(s):
    result = []
    if isinstance(s, slice):
        result.append(s.step)
        result.append(s.stop)
        result.append(s.start)
    elif isinstance(s, Idpression):
        result.append(s)
    elif isinstance(s, (int, float, bool)):
        pass
    else:
        raise NotImplementedError(type(s))
    return [r for r in result if isinstance(r, Idpression)]
