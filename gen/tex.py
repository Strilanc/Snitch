from typing import Tuple, Union, Dict, List, Optional
from idpression import Idpression, Literal, slice_deps, UniformTexSize


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
            self.slices_to_indexing([self.x_slice, self.y_slice], ['x', 'y']),
            self.tex.size.var_name)

    @staticmethod
    def slices_to_indexing(slices, var_labels):
        if len(slices) != len(var_labels):
            raise NotImplementedError()
        return ', '.join('float({}) + 0.5'.format(TexSlice.slice_innards(s, c))
                         for s, c in zip(slices, var_labels))

    @staticmethod
    def slice_innards(s, c='x'):
        def f(r):
            return Idpression.wrap(r).var_name

        if isinstance(s, int):
            return '{}'.format(s)

        if isinstance(s, slice):
            s = coalesce_slice(s)

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


class Tex(Idpression):

    def __init__(self,
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
                         [size],
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
        line = 'int(texture({}, gl_FragCoord.xy / {}).x * 255.0 + 0.5)'
        return line.format(
            self.var_name,
            self.tex_name(),
            self.size.var_name)

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
