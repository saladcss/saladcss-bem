var postcss = require('postcss');
var expect  = require('chai').expect;
var fs = require('fs');

var plugin = require('../');

function process (input, opts) {
    return postcss([ plugin(opts) ]).process(input);
}

function test (input, output, opts, done) {
    process(input, opts).then(function (result) {
        expect(result.css).to.eql(output);
        expect(result.warnings()).to.be.empty;
        done();
    }).catch(function (error) {
        done(error);
    });
}

function f(name) {
    var fullName = './test/fixtures/' + name + '.css';
    return fs.readFileSync(fullName, 'utf8').trim();
}

function testSame(input1, input2, opts, done) {
    var asyncResults  = [
        process(input1, opts),
        process(input2, opts)
    ];
    Promise
        .all(asyncResults)
        .then(function (results) {
            expect(results[0].css).to.eql(results[1].css);
            expect(results[0].warnings()).to.be.empty;
            expect(results[1].warnings()).to.be.empty;
            done();
        })
        .catch(function (error) {
            done(error);
        });
}

function testWarnings (input, output, warnings, opts, done) {
    process(input, opts).then(function (result) {
        var occuredWarnings = result.warnings();
        expect(result.css).to.eql(output);
        expect(occuredWarnings.length).to.be.equal(warnings.length);
        occuredWarnings.forEach(function (warning, i) {
            expect(warning.type).to.be.equal('warning');
            expect(warning.text).to.be.equal(warnings[i]);
        });
        done();
    }).catch(function (error) {
        done(error);
    });
}

function testErrors (input, reason, opts, done) {
    process(input, opts).then(function () {
        done(new Error('No errors thrown'));
    }).catch(function (error) {
        expect(error.constructor.name).to.be.equal('CssSyntaxError');
        expect(reason).to.be.equal(error.reason);
        done();
    });
}

function testSeparatorOverride (input, output, separatorName, separatorValue, done) {
    var separators = {};
    separators[separatorName] = separatorValue;
    test(input, output, {
        separators: separators
    }, done);
}

describe('postcss-bem', function () {
    describe('suit', function () {
        describe('@utility', function() {
            it('works with name', function (done) {
                test('@utility utilityName {}', '.u-utilityName {}', {}, done);
            });

            it('works with multiple names', function (done) {
                test('@utility utilityName1, utilityName2 {}', '.u-utilityName1, .u-utilityName2 {}', {}, done);
            });

            it('works with small', function(done) {
                test('@utility utilityName small {}', '.u-sm-utilityName {}', {}, done);
            });

            it('works with medium', function(done) {
                test('@utility utilityName medium {}', '.u-md-utilityName {}', {}, done);
            });

            it('works with large', function(done) {
                test('@utility utilityName large {}', '.u-lg-utilityName {}', {}, done);
            });

            it('works with multiple names and sizes', function(done) {
                test('@utility utilityName1 small, utilityName2 medium, utilityName3 large {}',
                    '.u-sm-utilityName1, .u-md-utilityName2, .u-lg-utilityName3 {}',
                    {}, done);
            });

            it('throws when no args are supplied', function(done) {
                testErrors('@utility {}', 'No names supplied to @utility', {}, done);
            });

            it('warns when too many args are supplied', function(done) {
                testWarnings('@utility a small c {}', '.u-sm-a {}', ['Too many parameters for @utility'], {}, done);
            });

            it('warns when two args are supplied, the second of which is not allowed', function(done) {
                testWarnings('@utility a b {}', '.u--a {}', ['Unknown variant: b'], {}, done);
            });
        });

        describe('@component-namespace', function () {
            it('should get removed when empty', function (done) {
                test('@component-namespace nmsp {}', '', {}, done);
            });
        });

        describe('@component', function() {
            it('works without properties', function (done) {
                test('@component ComponentName {}', '.ComponentName {}', {}, done);
            });

            it('works with properties', function (done) {
                test('@component ComponentName {color: red; text-align: right;}', '.ComponentName {color: red; text-align: right\n}', {}, done);
            });

            it('works in @component-namespace', function (done) {
                test('@component-namespace nmsp {@component ComponentName {color: red; text-align: right;}}', '.nmsp-ComponentName {color: red; text-align: right\n}', {}, done);
            });

            it('works after file-level @component-namespace', function (done) {
                test('@component-namespace nmsp; @component ComponentName {color: red; text-align: right;}', '.nmsp-ComponentName {color: red; text-align: right\n}', {}, done);
            });

            it('works with default namespace', function (done) {
                test('@component ComponentName {color: red; text-align: right;}', '.nmmmmsp-ComponentName {color: red; text-align: right\n}', {
                    defaultNamespace: 'nmmmmsp'
                }, done);
            });

            it('works in @component-namespace with default namespace', function (done) {
                test('@component-namespace nmsp {@component ComponentName {color: red; text-align: right;}}', '.nmsp-ComponentName {color: red; text-align: right\n}', {
                    defaultNamespace: 'nmmmmsp'
                }, done);
            });

            it('allows namespace separator overrides', function (done) {
                testSeparatorOverride('@component-namespace nmsp {@component ComponentName {color: red; text-align: right;}}', '.nmsp_ComponentName {color: red; text-align: right\n}', 'namespace', '_', done);
            });
        });

        describe('@modifier', function() {
            it('works without properties', function (done) {
                test('@component ComponentName {@modifier modifierName {}}', '.ComponentName {}\n.ComponentName--modifierName {}', {}, done);
            });

            it('works with properties', function (done) {
                test('@component ComponentName {color: red; text-align: right; @modifier modifierName {color: blue; text-align: left;}}', '.ComponentName {color: red; text-align: right\n}\n.ComponentName--modifierName {color: blue; text-align: left\n}', {}, done);
            });

            it('allows modifier separator overrides', function (done) {
                testSeparatorOverride('@component ComponentName {@modifier modifierName {}}', '.ComponentName {}\n.ComponentName__modifierName {}', 'modifier', '__', done);
            });

            it('accepts multiple modifier names', function (done) {
                test('@component Alert { @modifier error,warning {color: #f00;} }', '.Alert {}\n.Alert__error, .Alert__warning {color: #f00\n}', {}, done);
            });

            it('works inside of @descendent', function (done) {
                test('@component ComponentName {color: red; text-align: right; @descendent descendentName {color: blue; text-align: left; @modifier modifierName {color: green; text-align: center;}}}', '.ComponentName {color: red; text-align: right\n}\n.ComponentName-descendentName {color: blue; text-align: left\n}\n.ComponentName-descendentName__modifierName {color: green; text-align: center\n}', {}, done);
            });

            it('works inside of @descendent with multiple descendent and modifier names', function (done) {
                test('@component Box { @descendent header, content {font-weight: bold; @modifier red, important {color: #f00 } } }', '.Box {}\n.Box-header, .Box-content {font-weight: bold\n}\n.Box-header__red, .Box-content__red, .Box-header__important, .Box-content__important {color: #f00\n}', {}, done);
            });
        });

        describe('@descendent', function() {
            it('works without properties', function (done) {
                test('@component ComponentName {@descendent descendentName {}}', '.ComponentName {}\n.ComponentName-descendentName {}', {}, done);
            });

            it('works with properties', function (done) {
                test('@component ComponentName {color: red; text-align: right; @descendent descendentName {color: blue; text-align: left;}}', '.ComponentName {color: red; text-align: right\n}\n.ComponentName-descendentName {color: blue; text-align: left\n}', {}, done);
            });

            it('accepts multiple descendent names', function (done) {
                test('@component Box { @descendent header, content {font-weight: bold; } }', '.Box {}\n.Box-header, .Box-content {font-weight: bold\n}', {}, done);
            });

            it('allows descendent separator overrides', function (done) {
                testSeparatorOverride('@component ComponentName {@descendent descendentName {}}', '.ComponentName {}\n.ComponentName___descendentName {}', 'descendent', '___', done);
            });
        });

        describe('@when', function() {
            it('works without properties', function (done) {
                test('@component ComponentName {@when stateName {}}', '.ComponentName {}\n.ComponentName.is-stateName {}', {}, done);
            });

            it('works with properties', function (done) {
                test('@component ComponentName {color: red; text-align: right; @when stateName {color: blue; text-align: left;}}', '.ComponentName {color: red; text-align: right\n}\n.ComponentName.is-stateName {color: blue; text-align: left\n}', {}, done);
            });

            it('can be used in any selector', function (done) {
                test('.ComponentName {color: red; text-align: right; @when stateName {color: blue; text-align: left;}}', '.ComponentName {color: red; text-align: right}\n.ComponentName.is-stateName {color: blue; text-align: left}', {}, done);
            });

            it('can not be used in root', function (done) {
                testErrors('@when stateName {color: blue; text-align: left;}', '@when can only be used in rules which are not the root node', {}, done);
            });

            it('allows state separator overrides', function (done) {
                testSeparatorOverride('@component ComponentName {@when stateName {}}', '.ComponentName {}\n.ComponentName____stateName {}', 'state', '____', done);
            });
        });
    });

    describe('bem', function () {
        var useBem = {
            style: 'bem'
        };

        describe('@utility', function() {
            it('does nothing', function (done) {
                test('@utility utilityName {}', '@utility utilityName {}', useBem, done);
            });
        });

        describe('@component-namespace', function () {
            it('should get removed when empty', function (done) {
                test('@component-namespace nmsp {}', '', useBem, done);
            });
        });

        describe('@component', function() {
            it('works without properties', function (done) {
                test('@component component-name {}', '.component-name {}', useBem, done);
            });

            it('works with properties', function (done) {
                test('@component component-name {color: red; text-align: right;}', '.component-name {color: red; text-align: right\n}', useBem, done);
            });

            it('works in @component-namespace', function (done) {
                test('@component-namespace nmsp {@component component-name {color: red; text-align: right;}}', '.nmsp--component-name {color: red; text-align: right\n}', useBem, done);
            });

            it('works after file-level @component-namespace', function (done) {
                test('@component-namespace nmsp; @component component-name {color: red; text-align: right;}', '.nmsp--component-name {color: red; text-align: right\n}', useBem, done);
            });

            it('works with default namespace', function (done) {
                test('@component component-name {color: red; text-align: right;}', '.nmmmmsp--component-name {color: red; text-align: right\n}', {
                    defaultNamespace: 'nmmmmsp',
                    style: 'bem'
                }, done);
            });

            it('works in @component-namespace with default namespace', function (done) {
                test('@component-namespace nmsp {@component component-name {color: red; text-align: right;}}', '.nmsp--component-name {color: red; text-align: right\n}', {
                    defaultNamespace: 'nmmmmsp',
                    style: 'bem'
                }, done);
            });

            it('allows namespace separator overrides', function (done) {
                testSeparatorOverride('@component-namespace nmsp {@component component-name {color: red; text-align: right;}}', '.nmsp_component-name {color: red; text-align: right\n}', 'namespace', '_', done);
            });
        });

        describe('@modifier', function() {
            it('works without properties', function (done) {
                test('@component component-name {@modifier modifier-name {}}', '.component-name {}\n.component-name_modifier-name {}', useBem, done);
            });

            it('works with properties', function (done) {
                test('@component component-name {color: red; text-align: right; @modifier modifier-name {color: blue; text-align: left;}}', '.component-name {color: red; text-align: right\n}\n.component-name_modifier-name {color: blue; text-align: left\n}', useBem, done);
            });

            it('allows modifier separator overrides', function (done) {
                testSeparatorOverride('@component component-name {@modifier modifier-name {}}', '.component-name {}\n.component-name__modifier-name {}', 'modifier', '__', done);
            });

            it('works inside of @descendent', function (done) {
                test('@component component-name {color: red; text-align: right; @descendent descendent-name {color: blue; text-align: left; @modifier modifier-name {color: green; text-align: center;}}}', '.component-name {color: red; text-align: right\n}\n.component-name__descendent-name {color: blue; text-align: left\n}\n.component-name__descendent-name_modifier-name {color: green; text-align: center\n}', useBem, done);
            });
        });

        describe('@descendent', function() {
            it('works without properties', function (done) {
                test('@component component-name {@descendent descendent-name {}}', '.component-name {}\n.component-name__descendent-name {}', useBem, done);
            });

            it('works with properties', function (done) {
                test('@component component-name {color: red; text-align: right; @descendent descendent-name {color: blue; text-align: left;}}', '.component-name {color: red; text-align: right\n}\n.component-name__descendent-name {color: blue; text-align: left\n}', useBem, done);
            });

            it('allows descendent separator overrides', function (done) {
                testSeparatorOverride('@component component-name {@descendent descendent-name {}}', '.component-name {}\n.component-name___descendent-name {}', 'descendent', '___', done);
            });
        });

        describe('@when', function() {
            it('does nothing', function (done) {
                test('@component component-name {@when stateName {}}', '.component-name {@when stateName {}\n}', useBem, done);
            });
        });
    });

    describe('shortcuts', function () {
        var useBem = {
            shortcuts: {
                'component-namespace': 'ns',
                component: 'b',
                modifier: 'm',
                descendent: 'e'
            },
            style: 'bem'
        };
        var useSuit = {
            shortcuts: {
                utility: 'ut',
                'component-namespace': 'ns',
                component: 'com',
                modifier: 'mod',
                descendent: 'dec',
                when: 'state'
            }
        };

        describe('bem', function() {
            it('shortcut for component behaves the same way as component', function (done) {
                testSame(
                    '@component component-name {@descendent descendent-name {}}',
                    '@b component-name {@descendent descendent-name {}}', useBem, done);
            });
            it('shortcut for namespace behaves the same way as namespace', function (done) {
                testSame(
                    '@component-namespace nmsp {@component component-name {color: red; text-align: right;}}',
                    '@ns nmsp {@component component-name {color: red; text-align: right;}}', useBem, done);
            });
            it('shortcut for descendent behaves the same way as descendent', function (done) {
                testSame(
                    '@component component-name {@descendent descendent-name {}}',
                    '@component component-name {@e descendent-name {}}', useBem, done);
            });
            it('shortcut for modifier behaves the same way as modifier', function (done) {
                testSame(
                    '@component component-name {@modifier modifier-name {}}',
                    '@component component-name {@m modifier-name {}}', useBem, done);
            });
            it('shortcut for modifier behaves the same way as modifier', function (done) {
                testSame(
                    '@component component-name {color: red; text-align: right; @modifier modifier-name {color: blue; text-align: left;}}',
                    '@component component-name {color: red; text-align: right; @m modifier-name {color: blue; text-align: left;}}', useBem, done);
            });
            it('is beatiful', function(done){
                test(f('shortcuts.bem'), f('shortcuts.bem.expected'), useBem, done);
            });
        });
        describe('suit', function() {
            it('shortcut for component behaves the same way as component', function (done) {
                testSame(
                    '@component component-name {@descendent descendent-name {}}',
                    '@com component-name {@descendent descendent-name {}}', useSuit, done);
            });
            it('shortcut for utility behaves the same way as utility', function (done) {
                testSame(
                    '@utility utilityName {}',
                    '@ut utilityName {}', useSuit, done);
            });
            it('shortcut for namespace behaves the same way as namespace', function (done) {
                testSame(
                    '@component-namespace nmsp {@component ComponentName {color: red; text-align: right;}}',
                    '@ns nmsp {@component ComponentName {color: red; text-align: right;}}', useSuit, done);
            });
            it('shortcut for modifier behaves the same way as modifier', function (done) {
                testSame(
                    '@component component-name {@modifier modifier-name {}}',
                    '@component component-name {@mod modifier-name {}}', useSuit, done);
            });
            it('shortcut for descendent behaves the same way as descendent', function (done) {
                testSame(
                    '@component component-name {@descendent descendent-name {}}',
                    '@component component-name {@dec descendent-name {}}', useSuit, done);
            });
            it('shortcut for @when behaves the same way as @when', function (done) {
                testSame(
                    '@component ComponentName {@when stateName {}}',
                    '@component ComponentName {@state stateName {}}', useSuit, done);
            });
        });
    });
});
