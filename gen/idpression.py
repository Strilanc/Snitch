from typing import List, Optional, Union, Dict

_next_id = 0


def next_id():
    global _next_id
    _next_id += 1
    return _next_id - 1


class Idpression(object):
    """
    An idempotent expression that can be stored in a named variable.
    """

    __hash__ = object.__hash__

    def __init__(self,
                 name: str,
                 dependencies: List['Idpression'],
                 uniform_dependencies: List['Idpression'] = (),
                 add_id_suffix_to_name=True):
        self.dependencies = dependencies
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
        return BinaryOp(self, other, 'bitwise_or', '|')

    def __and__(self, other):
        return BinaryOp(self, other, 'bitwise_and', '&')

    def __invert__(self):
        return UnaryOp(self, 'not', '!')

    def __neg__(self):
        return UnaryOp(self, 'neg', '-')

    def __xor__(self, other) -> 'Idpression':
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

    def __getitem__(self, item):
        x_slice, y_slice = item
        return PseudoSlice(self, x_slice, y_slice)

    @staticmethod
    def wrap(val: Union[bool, int, float, 'Idpression']) -> 'Idpression':
        if isinstance(val, Idpression):
            return val
        if isinstance(val, bool):
            return Literal('true' if val else 'false', -1 if val else 0)
        if isinstance(val, (int, float)):
            return Literal(repr(val), val)
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
    def __init__(self, literal_text: str, python_equivalent):
        super().__init__(literal_text, [], [], False)
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
    def __init__(self, type, set_key, spread, name, add_id_suffix_to_name=True):
        super().__init__(name, [], add_id_suffix_to_name=add_id_suffix_to_name)
        self.type = type
        self.set_key = set_key
        self.spread = spread

    def __getitem__(self, item):
        return ValueError()

    def uniform_lines(self):
        return [
            'uniform {} {};'.format(self.type, self.var_name),
        ]

    def uniform_args(self):
        return {
            "['{}', {}, {}]".format(self.set_key,
                                    self.var_name,
                                    'true' if self.spread else 'false')
        }


class UniformTexSize(Uniform):
    def __init__(self, name, add_id_suffix_to_name=True):
        super().__init__('vec2',
                         '2f',
                         True,
                         name,
                         add_id_suffix_to_name=add_id_suffix_to_name)

    def uniform_lines(self):
        return [
            'uniform vec2 {};'.format(self.var_name)
        ]

    def uniform_args(self):
        return []


class UnaryOp(Idpression):
    def __init__(self, val, prefix, op_char):
        val = Idpression.wrap(val)
        super().__init__(prefix, [val])
        self.val = val
        self.op_char = op_char

    def formula(self):
        return 'int({}({}))'.format(
            self.op_char,
            self.val.var_name)


class BinaryOp(Idpression):
    def __init__(self, lhs, rhs, prefix, op_char):
        lhs = Idpression.wrap(lhs)
        rhs = Idpression.wrap(rhs)
        super().__init__(prefix, [lhs, rhs])
        self.lhs = lhs
        self.rhs = rhs
        self.op_char = op_char

    def formula(self):
        return 'int(({}) {} ({}))'.format(
            self.lhs.var_name,
            self.op_char,
            self.rhs.var_name)


class PseudoSlice(Idpression):
    def __init__(self, val: Idpression, x_slice: slice, y_slice: slice):
        deps = ([dep[x_slice, y_slice] for dep in val.dependencies] +
                slice_deps(x_slice) +
                slice_deps(y_slice))
        super().__init__('slice', deps)
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
    def __init__(self, clauses, else_result):
        terms = []
        for a, b in clauses:
            terms.append(a)
            terms.append(b)
        terms.append(else_result)
        terms = [t for t in terms if isinstance(t, Idpression)]
        super().__init__('match', terms)
        self.clauses = clauses
        self.else_result = else_result

    @staticmethod
    def simplify(clauses, else_result):
        result = []
        for i in range(len(clauses)):
            if isinstance(clauses[i][0], Literal) and clauses[i][0].python_equivalent is not None:
                if clauses[i][0].python_equivalent:
                    return clauses[:i], clauses[i][1]
                continue
            result.append(clauses[i])

        return result, else_result

    def formula(self):
        lines = ['']
        for a, b in self.clauses:
            lines.append('({}) ? ({}) :'.format(
                Idpression.wrap(a).var_name,
                Idpression.wrap(b).var_name))
        lines.append('({})'.format(Idpression.wrap(self.else_result).var_name))
        return '\n                '.join(lines)


def slice_deps(s):
    result = []
    if isinstance(s, Idpression):
        result.append(s)
    elif isinstance(s, slice):
        result.append(s.step)
        result.append(s.stop)
        result.append(s.start)
    else:
        raise NotImplementedError()
    return [r for r in result if isinstance(r, Idpression)]
