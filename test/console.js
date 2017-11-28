import test from 'ava';

import * as mktemp from 'mktemp';
import {
    exec,
} from 'child-process-promise';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as jstracer from '../lib';
import * as upath from 'upath';

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

const write_file = (t, filename,filecon) => new Promise(resolve => {
    fs.writeFile(filename,filecon, (err) => {
        t.truthy(err === undefined || err === null, `write [${filecon}] error [${err}]`);
        resolve(filename);
    });
});

const add_line = (linestr, args, note) => {
    if (args === undefined || args === null) {
        args = {};
        args.writestr = '';
        args.lineno = 0;
        args.lines = [];
        args.notes = [];
    }
    args.lineno += 1;
    args.writestr += linestr;
    args.writestr += '\n';
    if (note !== undefined && note !== null) {
        args.lines.push(args.lineno);
        args.notes.push(note);
    }

    return args;
};

const add_note = (args,lineno,note) => {
    if (args === undefined || args === null) {
        args = {};
        args.writestr = '';
        args.lineno = 0;
        args.lines = [];
        args.notes = [];
    }

    if (lineno !== undefined && lineno !== null && note !== undefined && note !== null) {
        args.lines.push(lineno);
        args.notes.push(note);
    }
    return args;
};

const format_cmd = (file,...args) => {
    let retcmd = `node "${file}"`;
    let idx;
    if (args !== null && args !== null) {
        for (idx = 0; idx < args.length; idx += 1) {
            retcmd += " "  + $args[idx];
        }
    }
    return retcmd;
};

const parse_line_note = (l) => {
    let retnote = {};
    let matchexpr = new RegExp('<([^>]+)>\\s+\\[([^\\]]+)\\]\\s+.*');
    let m;
    let lastidx;
    let finded;
    let subs;
    retnote.note = '';
    retnote.lineno = 0;

    m = matchexpr.exec(l);
    if (m !== undefined && m !== null) {
        retnote.note = m[0];
        cstr = m[1];
        lastidx = cstr.length;
        finded = 0
        while(lastidx >= 0 && finded === 0) {
            lastidx -= 1;
            if (cstr[lastidx] === ':') {
                finded = 1;
                break;
            }
        }

        if (lastidx > 0) {
            subs = cstr.substring(lastidx + 1);
            retnote.lineno = parseInt(subs,10);
        }
    }
    return retnote;
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

test.cb('call line func check', t => {
    let args;
    let includepath = path.resolve(path.join(__dirname,'..','lib'));
    let notearr = ['trace','info','debug','warn','error','trace','info','debug','warn','error'];
    let linearr = [];
    let idx;


    includepath = upath.toUnix(includepath);
    args = add_line(util.format('var jstracer(\'%s\');', includepath));
    args = add_line('var args = {};', args);
    args = add_line('var callA1 = function(...args) {', args);
    args = add_line('   let newargs = {};', args);
    args = add_line('   newargs.verbose = 5;', args);
    args = add_line('   let logger = jstracer.set_args(newargs,\'newcall\');', args);
    args = add_line('   jstracer.trace(...args);', args, 'trace');
    linearr.push(args.lineno);
    args = add_line('   jstracer.info(...args);', args, 'info');
    linearr.push(args.lineno);
    args = add_line('   jstracer.debug(...args);', args, 'debug');
    linearr.push(args.lineno);
    args = add_line('   jstracer.warn(...args);', args, 'warn');
    linearr.push(args.lineno);
    args = add_line('   jstracer.error(...args);', args, 'error');
    linearr.push(args.lineno);
    args = add_line('   logger.trace(...args);', args, 'trace');
    linearr.push(args.lineno);
    args = add_line('   logger.info(...args);', args, 'info');
    linearr.push(args.lineno);
    args = add_line('   logger.debug(...args);', args, 'debug');
    linearr.push(args.lineno);
    args = add_line('   logger.warn(...args);', args, 'warn');
    linearr.push(args.lineno);
    args = add_line('   logger.error(...args);', args, 'error');
    linearr.push(args.lineno);

    for (idx = 0 ; idx < notearr.length ; idx += 1) {
        args = add_note(args, notearr[idx],linearr[idx]);
    }

    args = add_line('};', args);
    args = add_line('', args);

    args = add_line('var callA2 = function(...args) {', args);
    args = add_line('   callA1(...args);', args);
    for (idx =0 ; idx < notearr.length; idx += 1) {
        args = add_note(args,notearr[idx], args.lineno);
    }


    args = add_line('};',args);
    args = add_line('', args);

    args = add_line('var callA3 = function(...args) {', args);
    args = add_line('    callA2(...args);', args);
    for (idx = 0; idx < notearr.length; idx += 1) {
        args = add_note(args, notearr[idx],args.lineno);
    }

    args = add_line('};', args);
    args = add_line('', args);

    args = add_line('args.verbose = 5;', args);
    args = add_line('jstracer.set_args(args);', args);
    args = add_line('callA1(\'hello %s\', \'world\');', args);
    args = add_line('callA1(0,\'hello %s\', \'world\');', args);
    args = add_line('callA2(1,\'hello %s\', \'world\');', args);
    args = add_line('callA3(2,\'hello %s\', \'world\');', args);


    Promise.all([
        create_file(t,'runlogXXXXXX.log')
    ])
    .then( files => {
        Promise.all([
            write_file(t,files[0])
        ])
        .then( () => {
            const retcmd = format_cmd(files[0]);
            exec(retcmd)
            .then(res => {
                const lines = res.stderr.toString().split('\n').filter(l => l.length > 0);
                let idx;
                let retnote;
                for (idx = 0; idx < lines.length ; idx += 1) {
                    retnote = parse_line_note(lines[idx]);
                    t.truthy(retnote.note === args.notes[idx], util.format('[%s][%s] !== [%s]', idx, retnote.note, args.notes[idx]));
                    t.truthy(retnote.lineno === args.lines[idx], util.format('[%s][%s] !== [%s]', idx, retnote.lineno, args.lines[idx]));
                }
                Promise.all([
                    delete_file(t,files[0])
                    ])
                .then( () => {
                    t.end();
                })
                .catch( err4 => {
                    t.truthy(err4 === undefined || err4 === null, util.format('remove [%s] error[%s]', files[0], err4));
                    t.end();
                });
            })
            .catch( err3 => {
                t.truthy(err3 === undefined || err3 === null, `run [${retcmd}] error [${err3}]`);
                t.end();
            });
        })
        .catch( err2 => {
            t.truthy(err2 === undefined || err2 === null, `write file [${file}] error [${err2}]`);
            t.end();
        });
    })
    .catch( err => {
        t.truthy(err === null || err === undefined, `create file error ${err}`);
        t.end();
    });

});
