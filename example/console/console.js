// import * as jslog from '../../lib';

import * as jslog from '../../lib';

// const jslog = require('../../lib');
const extargsparse = require('extargsparse');

const commandline = `{
  "$" : "+"
}`;

const trace_exit = function(ec) {
    jslog.finish(err => {
        if (err) {
            return;
        }
        process.exit(ec);
    });
};

process.on('uncaughtException', err => {
    'use struct';

    jslog.error('error (%s) stack(%s)', err, err.stack);
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
parser = jslog.init_args(parser);
const args = parser.parse_command_line();

jslog.set_args(args);
args.args.forEach(l => {
    jslog.error('%s', l);
    jslog.warn('%s', l);
    jslog.info('%s', l);
    jslog.debug('%s', l);
    jslog.trace('%s', l);
});

