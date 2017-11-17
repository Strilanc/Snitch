from typing import Tuple, Union, Dict, List, Optional
from idpression import (
    Idpression,
    Literal,
    slice_deps,
    UniformTexSize,
    Byte,
    ShaderType,
)
import shader


def coalesce_slice(s: Union[slice, Idpression, int]) -> slice:
    if isinstance(s, (int, Idpression)):
        return slice(s, None, 1)

    if s.stop is not None:
        raise NotImplementedError('stop')
    if s.step is not None and s.step < 1:
        raise ValueError('step')

    return slice(
        0 if s.start is None else s.start,
        s.stop,
        1 if s.step is None else s.step)


def nest_slice(s1: slice, s2: Union[slice, Idpression, int]) -> slice:
    if not isinstance(s1, slice):
        raise ValueError('Not a slice.')
    s1 = coalesce_slice(s1)
    if isinstance(s2, slice):
        s2 = coalesce_slice(s2)
        return slice(s1.start + s1.step * s2.start, None, s1.step * s2.step)
    return s1.start + s2 * s1.step


class TexSlice(Idpression):
    def __init__(self, tex: 'Tex', x_slice: slice, y_slice: slice):
        super().__init__(
            'slice',
            val_type=tex.val_type,
            dependencies=[tex.size] + slice_deps(x_slice) + slice_deps(y_slice),
            uniform_dependencies=[tex])
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
        read_expression = 'texture(({}), vec2({}) / ({}))'.format(
            self.tex.tex_name(),
            self.indices_to_formula(
                [self.x_slice, self.y_slice],
                ['x', 'y'],
                ['gl_FragCoord.x', 'gl_FragCoord.y']),
            self.tex.size.var_name)
        return self.val_type.from_in(read_expression)

    @staticmethod
    def indices_to_formula(indices, var_labels, var_raws):
        if len(indices) != len(var_labels):
            raise NotImplementedError()
        parts = [
            TexSlice.index_to_formula(index, label, raw)
            for index, label, raw in zip(indices, var_labels, var_raws)
        ]
        return ', '.join(parts)

    @staticmethod
    def index_to_formula(index: Union[int, slice, Idpression],
                         compute_var: str='x',
                         raw_var: str='gl_FragCoord.x'):
        if index is shader.X:
            return 'gl_FragCoord.x'
        if index is shader.Y:
            return 'gl_FragCoord.y'
        if (isinstance(index, slice) and
                index.step is None and
                index.stop is None and
                index.start is None):
            return raw_var
        return 'float({}) + 0.5'.format(
            TexSlice._int_index_to_formula(index, compute_var))

    @staticmethod
    def _int_index_to_formula(index: Union[int, slice, Idpression],
                              compute_var: str='x'):
        def f(r):
            return Idpression.wrap(r).var_name

        if isinstance(index, int):
            return '{}'.format(index)

        if isinstance(index, slice):
            index = coalesce_slice(index)

            if index.start:
                if index.step != 1:
                    return '({})*({}) + ({})'.format(
                        compute_var, f(index.step), f(index.start))
                return '({}) + ({})'.format(compute_var, f(index.start))
            if index.step != 1:
                return '({})*({})'.format(compute_var, f(index.step))
            return compute_var

        if isinstance(index, Idpression):
            return index.var_name

        raise NotImplementedError(str(type(index)))


class Tex(Idpression):

    def __init__(self,
                 val_type: ShaderType,
                 steps: Optional[List[str]] = None,
                 size: Optional[Idpression] = None,
                 name: Optional[str] = None):
        if size is None:
            if name is None:
                size = UniformTexSize('tex_size')
            else:
                size = UniformTexSize('{}_size'.format(name),
                                      add_id_suffix_to_name=False)
        super().__init__('v_' + (name or 'tex'),
                         val_type=val_type,
                         dependencies=[size],
                         add_id_suffix_to_name=name is None)
        self.steps = steps
        self.size = size

    def uniform_args(self):
        return {
            "['tex', '{}', '{}']".format(self.tex_name(), self.size.var_name)
        }

    def uniform_lines(self):
        return [
            'uniform sampler2D {};'.format(self.tex_name()),
        ]

    def tex_name(self):
        return self.var_name[2:]

    def formula(self):
        read_expression = 'texture(({}), gl_FragCoord.xy / ({}))'.format(
            self.tex_name(),
            self.size.var_name)
        return self.val_type.from_in(read_expression)

    def __getitem__(self, item: Tuple[slice, slice]) -> TexSlice:
        x, y = item
        return TexSlice(self, x, y)

    def __setitem__(self, key: Tuple[slice, slice], value):
        slice_x, slice_y = key
        write = TexWrite(Idpression.wrap(value), self, slice_x, slice_y)
        if self.steps is not None:
            self.steps.append(write)


class TexWrite(object):
    def __init__(self,
                 src: Idpression,
                 dst: Tex,
                 x_slice: slice,
                 y_slice: slice):
        self.src = src
        self.dst = dst
        self.x_slice = x_slice
        self.y_slice = y_slice

    def generate_js(self):
        deps = self.src.collect_ascending_deps(include_uniforms=True)
        args = sorted([d.var_name for d in deps if isinstance(d, Tex)])
        r = """
            {}.withArgs({}).renderIntoTexPair({})
            """.format(self.src.var_name,
                       ', '.join(args),
                       self.dst.var_name)
        return r
