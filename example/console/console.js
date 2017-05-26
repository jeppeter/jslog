
import * as jstracer from '../../lib';
import * as extargsparse from 'extargsparse';

const commandline = `{
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

jstracer.set_args(args);
args.args.forEach(l => {
    jstracer.error('%s', l);
    jstracer.warn('%s', l);
    jstracer.info('%s', l);
    jstracer.debug('%s', l);
    jstracer.trace('%s', l);
});

