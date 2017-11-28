import * as jstracer from '../../lib';

const trace_exit = function(ec) {
    jstracer.finish(err => {
        if (err) {
            return;
        }
        process.exit(ec);
    });
};

process.on('uncaughtException', err => {
    'use struct';

    jstracer.error('error (%s) stack(%s)', err, err.stack);
    trace_exit(3);
});

process.on('SIGINT', () => {
    trace_exit(0);
});

const args = {
    verbose: 1,
    log_files: [],
    log_appends: [],
    log_console: true,
    log_format: '<{{title}}> {{message}}\n',
};

const value = 'code';
const lvalue = 32;

jstracer.set_args(args);

jstracer.error('value %s lvalue %s', value, lvalue);
jstracer.warn('value %s lvalue %s', value, lvalue);
jstracer.info('value %s lvalue %s', value, lvalue);
jstracer.debug('value %s lvalue %s', value, lvalue);
jstracer.trace('value %s lvalue %s', value, lvalue);
