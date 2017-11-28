# nodejs tracer handle
> tracer for multiple handles for use

### Release History
* Nov 28th 2017 Release 1.1.2 to fixup bug when call the output format of line and files


```js
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
```

> output 
```shell
<error> [Z:\\jstracer\\libexample\\console\\console2.js:Object.<anonymous>:42] value code lvalue 32
<warn> [Z:\\jstracer\\libexample\\console\\console2.js:Object.<anonymous>:43] value code lvalue 32
```


> to get the special case for special name

```js

import * as jstracer from '../../lib';
import * as extargsparse from 'extargsparse';

const commandline = `{
  "logname|n" : null,
  "$" : "+"
}`;

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

let parser = extargsparse.ExtArgsParse({
    help_func(ec, s) {
        let fp;
        if (ec === 0) {
            fp = process.stdout;
        } else {
            fp = process.stderr;
        }
        fp.write(s);
        trace_exit(ec);
    },
});
parser.load_command_line_string(commandline);
parser = jstracer.init_args(parser);
const args = parser.parse_command_line();

const logger = jstracer.set_args(args,args.logname);
args.args.forEach(l => {
    logger.error('%s', l);
    logger.warn('%s', l);
    logger.info('%s', l);
    logger.debug('%s', l);
    logger.trace('%s', l);
});

```

> shell call 

```shell
node example2.js  -n logger1 -vvvv "hello world"
```

> output

```shell
<error> [Z:\\jstracer\\libexample\\console\\logname.js::53] hello world
<warn> [Z:\\jstracer\\libexample\\console\\logname.js::54] hello world
<info> [Z:\\jstracer\\libexample\\console\\logname.js::55] hello world
<debug> [Z:\\jstracer\\libexample\\console\\logname.js::56] hello world
<trace> [Z:\\jstracer\\libexample\\console\\logname.js::57] hello world
```

## reference for the key of args set
-  verbose  is the verbose mode default 0 for just error output 
            1 for warn output
            2 for info output
            3 for debug output
            4 for trace output <br>
-  log_files  to log into the file default none ,not to the file 
-  log_appends : almost as log_files ,but append log to the end of the file
-  log_console : default true for stderr  if false ,no logout to stdout
-  log_format : default '<{{title}}> {{message}}\n' will give the vivid
