# nodejs tracer handle
> tracer for multiple handles for use

```js
import * as jstracer from 'jstracer';

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
    log_format: '<{{title}}>:{{file}}:{{line}} {{message}}\n',
};

const value = 'code';
const lvalue = 32;

jstracer.set_args(args);

jstracer.error('value %s lvalue %s', value, lvalue);
jstracer.warn('value %s lvalue %s', value, lvalue);
jstracer.info('value %s lvalue %s', value, lvalue);
jstracer.debug('value %s lvalue %s', value, lvalue);
jstracer.trace('value %s lvalue %s', value, lvalue);
```

> output 
```shell
\<error\>:console2.js:42 value code lvalue 32
\<warn\>:console2.js:43 value code lvalue 32
```

## reference for the key of args set
> verbose  is the verbose mode default 0 for just error output 
>            1 for warn output
>            2 for info output
>            3 for debug output
>            4 for trace output
>  log_files  to log into the file default none ,not to the file 
>  log_appends : almost as log_files ,but append log to the end of the file
>  log_console : default true for stderr  if false ,no logout to stdout
>  log_format : default '<{{title}}>:{{file}}:{{line}} {{message}}\n' will give the vivid
