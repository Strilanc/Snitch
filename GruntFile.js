// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        karma: {
            unit: {
                configFile: 'karma.test.conf.js'
            },
            'unit-chrome': {
                configFile: 'karma.test.conf.js',
                browsers: ['Chrome']
            },
            'unit-firefox': {
                configFile: 'karma.test.conf.js',
                browsers: ['Firefox']
            },
            'unit-travis': {
                configFile: 'karma.test.conf.js',
                browsers: ['Firefox']
            },
            'perf-chrome': {
                configFile: 'karma.test_perf.conf.js',
                browsers: ['Chrome']
            }
        },
        clean: {
            'clean-tmp': ['out/tmp'],
        }
    });

    grunt.registerTask('wrap-packages', function(src, root, dst) {
        var sourceFiles = grunt.file.glob.sync(src);
        var rootFiles = grunt.file.glob.sync(root);
        for (var i = 0; i < rootFiles.length; i++) {
            if (sourceFiles.indexOf(rootFiles[i]) === -1) {
                sourceFiles.push(rootFiles[i]);
            }
        }

        var header = [
            '"use strict";',
            'let _gen_packages_vals = new Map();',
            'let _gen_packages_inits = new Map();',
            'function _gen_package_export(key, vals) {',
            '    let dict = _gen_packages_vals.get(key);',
            '    for (let valKey of Object.keys(vals)) {',
            '        dict[valKey] = vals[valKey];',
            '    }',
            '}',
            'function _gen_package_get(key) {',
            '    if (!_gen_packages_vals.has(key)) {',
            '        _gen_packages_vals.set(key, new Map());',
            '        if (!_gen_packages_inits.has(key)) {',
            '            throw new Error(`Unknown import: "${key}"`);',
            '        }',
            '        _gen_packages_inits.get(key)();',
            '    }',
            '    return _gen_packages_vals.get(key);',
            '}'
        ].join('\n');

        var wrappedContent = sourceFiles.map(function(path) {
            var content = grunt.file.read(path);

            content = content.replace(new RegExp(
                /\bexport\s*(\{.+\})/,
                'g'),
                function (match, vals) {
                    return '_gen_package_export(' + JSON.stringify(path) + ', ' + vals + ');'
                });

            content = content.replace(new RegExp(
                /\bimport (.+) from (['"].+['"])/,
                'g'),
                function(match, vals, key) {
                    return 'const ' + vals + ' = _gen_package_get(' + key + ');'
                });

            return '///////////////////////////////////////////////////////////////////////////////////////////////\n' +
                   '_gen_packages_inits.set(' + JSON.stringify(path) + ', function() {\n\n' + content + '\n\n});';
        }).join('\n\n');

        var triggers = rootFiles.map(function(path) {
            return '_gen_package_get(' + JSON.stringify(path) + ');';
        }).join('\n');

        var all = [header, wrappedContent, triggers].join('\n\n\n') + '\n';

        grunt.file.write(dst, all);
    });

    grunt.registerTask('bootstrap-get-packages', function(src, dst) {
        var packagedFiles = grunt.file.glob.sync(src);
        var getters = packagedFiles.map(function(e) {
            return '$traceurRuntime.getModule("' + e + '");';
        }).join('\n');
        grunt.file.write(dst, getters);
    });

    grunt.registerTask('inject-js-into-html', function(htmlSrc, jsSrc, dst) {
        var html = grunt.file.read(htmlSrc);
        var js = grunt.file.read(jsSrc);
        var output = html;
        output = output.split("<!-- INCLUDE SOURCE PART -->").join(js);
        grunt.file.write(dst, output);
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-karma');

    grunt.registerTask('build-debug', [
        'clean:clean-tmp',
        'wrap-packages:src/**/*.js:src/**/*.js:out/tmp/wrapped-src.js',
        'inject-js-into-html:html/snitch.template.html:out/tmp/wrapped-src.js:out/snitch.html',
        'clean:clean-tmp',
    ]);
    grunt.registerTask('build-test', [
        'wrap-packages:src/**/*.js:test/**/*.js:out/test.js',
    ]);
    grunt.registerTask('build-test-perf', [
        'wrap-packages:src/**/*.js:test_perf/**/*.js:out/test_perf.js',
    ]);

    grunt.registerTask('test-perf-chrome', ['build-test-perf', 'karma:perf-chrome']);
    grunt.registerTask('test-chrome', ['build-test', 'karma:unit-chrome']);
    grunt.registerTask('test-firefox', ['build-test', 'karma:unit-firefox']);
    grunt.registerTask('test-travis', ['build-test', 'karma:unit-travis']);
};
