from typing import List, Optional, Union

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

    def formula(self) -> Optional[str]:
        """An expression for this value, or None if the var_name works fine."""
        return None

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

    def __getitem__(self, item):
        x_slice, y_slice = item
        return PseudoSlice(self, x_slice, y_slice)

    @staticmethod
    def wrap(val: Union[bool, int, float, 'Idpression']) -> 'Idpression':
        if isinstance(val, Idpression):
            return val
        if isinstance(val, (int, float)):
            return Literal(repr(val))
        if isinstance(val, bool):
            return Literal('true' if val else 'false')
        raise ValueError('Unrecognized val: {}'.format(val))


class Literal(Idpression):
    def __init__(self, literal_text: str):
        super().__init__(literal_text, [], [], False)

    def __getitem__(self, item):
        return ValueError()

    def uniform_lines(self):
        return []


class Uniform(Idpression):
    def __init__(self, type, name):
        super().__init__(name, [])
        self.type = type

    def __getitem__(self, item):
        return ValueError()

    def uniform_lines(self):
        return [
            'uniform {} {};'.format(self.type, self.var_name),
        ]

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
