import test from 'ava';
// import * as jslog from '../lib';
import * as mktemp from 'mktemp';
import {
    exec,
} from 'child-process-promise';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as jstracer from '../lib';

const match_expr_lines = (t, lines, matchexprs) => {
    t.truthy(lines.length === matchexprs.length, util.format('%s === %s', lines.length, matchexprs.length));
    for (let idx = 0; idx < lines.length; idx += 1) {
        const curline = lines[idx].replace(/[\r\n]+$/, '');
        let bret = false;
        if (curline.match(matchexprs[idx])) {
            bret = true;
        }
        t.truthy(bret === true, util.format('%s match %s', lines[idx], matchexprs[idx]));
    }
};
const verfiyfile_handle = (t, filename, matchexprs) => new Promise(resolve => {
    fs.readFile(filename, (err, data) => {
        t.truthy(err === undefined || err === null, `read file [${filename}] error[${err}]`);
        const lines = data.toString().split('\n').filter(l => l.length > 0);
        match_expr_lines(t, lines, matchexprs);
        resolve();
    });
});

const delete_file = (t, filename) => new Promise(resolve => {
    fs.unlink(filename, err => {
        t.truthy(err === undefined || err === null, `delete file [${filename}] error[${err}]`);
        resolve();
    });
});

const create_file = (t, templatename) => new Promise(resolve => {
    mktemp.createFile(templatename, (err, filename) => {
        t.truthy(err === undefined || err === null, `mktemp [${templatename}] error [${err}]`);
        resolve(filename);
    });
});

const get_console_cmd = (...args) => {
    const topdir = path.normalize(`${__dirname}${path.sep}..`);
    const consolebin = path.normalize(`${topdir}${path.sep}libexample${path.sep}console${path.sep}console.js`);
    let cmdline = `node ${consolebin}`;
    if (args.length > 0) {
        cmdline += ' ';
        cmdline += args.join(' ');
    }
    return cmdline;
};

const range = n => Array.from(Array(n).keys());


test.cb('to get console out', t => {
    // now to give the coding for out
    const cmd = get_console_cmd('hello', 'world');
    exec(cmd)
        .then(res => {
            const lines = res.stderr.toString().split('\n').filter(l => l.length > 0);
            match_expr_lines(t, lines, ['.*hello$', '.*world$']);
            t.end();
        })
        .catch(err => {
            t.truthy(false === true, util.format('can not run [%s] error[%s]', cmd, err));
            t.end();
        });
});

test.cb('to give no console output', t => {
    const cmd = get_console_cmd('--no-log-console', 'hello', 'world');
    exec(cmd)
        .then(res => {
            const lines = res.stderr.toString().split('\n').filter(l => l.length > 0);
            match_expr_lines(t, lines, []);
            t.end();
        })
        .catch(err => {
            t.truthy(false === true, util.format('can not run [%s] error[%s]', cmd, err));
            t.end();
        });
});

test.cb('to get the console warn', t => {
    const cmd = get_console_cmd('-v', 'hello', 'world');
    exec(cmd)
        .then(res => {
            const lines = res.stderr.toString().split('\n').filter(l => l.length > 0);
            match_expr_lines(t, lines, ['^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$']);
            t.end();
        })
        .catch(err => {
            t.truthy(false === true, util.format('can not run [%s] error[%s]', cmd, err));
            t.end();
        });
});


test.cb('to get output file', t => {
    Promise.all([
        create_file(t, 'outputXXXXXX.log'),
    ])
        .then(files => {
            t.truthy(files.length === 1, `files ${files}`);
            const cmd = get_console_cmd('--no-log-console', '-v', '--log-files', files[0], 'hello', 'world');
            exec(cmd)
                .then(res => {
                    const lines = res.stderr.toString().split('\n').filter(l => l.length > 0);
                    match_expr_lines(t, lines, []);
                    Promise.all(
                            files.map(f => verfiyfile_handle(t, f, ['^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$']))
                        )
                        .then(() => {
                            Promise.all(
                                    files.map(f => delete_file(t, f))
                                )
                                .then(() => {
                                    t.end();
                                });
                        });
                })
                .catch(err4 => {
                    t.truthy(false === true, `can not run [${cmd}] error[${err4}]`);
                    t.end();
                });
        });
});


test.cb('to make multiple output', t => {
    Promise.all(
            range(2).map(() => create_file(t, 'outputXXXXXX.log'))
        )
        .then(files => {
            const cmd = get_console_cmd('-v', '--log-files', files[0], '--log-appends', files[1], 'hello', 'world');
            exec(cmd)
                .then(res => {
                    const lines = res.stderr.toString().split('\n').filter(l => l.length > 0);
                    match_expr_lines(t, lines, ['^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$']);
                })
                .then(() => {
                    Promise.all([
                        verfiyfile_handle(t, files[0], ['^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$']),
                        verfiyfile_handle(t, files[1], ['^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$']),
                    ])
                    .then(() => {
                        exec(cmd)
                            .then(res2 => {
                                const rlines = res2.stderr.toString().split('\n').filter(l => l.length > 0);
                                match_expr_lines(t, rlines, ['^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$']);
                            })
                            .then(() => {
                                Promise.all([
                                    verfiyfile_handle(t, files[0], ['^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$']),
                                    verfiyfile_handle(t, files[1], ['^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$', '^<error>.*hello$', '^<warn>.*hello$', '^<error>.*world$', '^<warn>.*world$']),
                                ])
                                .then(() => {
                                    Promise.all(
                                        files.map(f2 => delete_file(t, f2))
                                        )
                                        .then(() => {
                                            t.end();
                                        });
                                });
                            });
                    });
                });
        })
        .catch(err => {
            t.truthy(err === undefined || err === null, `create file error[${err}]`);
            t.end();
        });
});


test.cb('to get logger name', t => {
    Promise.all(
            range(2).map(() => create_file(t, 'outputXXXXXX.log'))
        )
        .then(files => {
            const log1opt = {
                log_console: false,
                log_files: [files[0]],
                level: 'warn',
            };
            const log2opt = {
                log_console: false,
                log_files: [files[1]],
                level: 'warn',
            };
            const logger1 = jstracer.Init(log1opt, 'logger1');
            const logger2 = jstracer.Init(log2opt, 'logger2');
            logger1.warn('warn logger1');
            logger1.info('info logger1');
            logger2.warn('warn logger2');
            logger2.info('info logger2');
            logger1.finish(err => {
                t.truthy(err === undefined || err === null, `finish logger1 error[${err}]`);
                logger2.finish(err2 => {
                    t.truthy(err === undefined || err === null, `finish logger2 error[${err2}]`);
                    Promise.all([
                        verfiyfile_handle(t, files[0], ['^<warn>.*warn logger1$']),
                        verfiyfile_handle(t, files[1], ['^<warn>.*warn logger2$']),
                    ])
                        .then(() => {
                            Promise.all(
                                files.map(f2 => delete_file(t, f2))
                            )
                            .then(() => {
                                t.end();
                            });
                        })
                        .catch(err3 => {
                            t.truthy(err3 === undefined || err3 === null, `match file error [${err3}]`);
                            t.end();
                        });
                });
            });
        })
        .catch(err => {
            t.truthy(err === undefined || err === null, `create file error [${err}]`);
            t.end();
        });
});
