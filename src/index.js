const tracer = require('tracer');
const util = require('util');
const fs = require('fs');

const add_write_streams = (self, arfiles, isappend) => {
    let openflags;
    openflags = 'w+';
    if (isappend) {
        openflags = 'a+';
    }
    arfiles.forEach(elm => {
        const ws = fs.createWriteStream(elm, {
            flags: openflags,
            defaultEncoding: 'utf8',
            autoclose: true,
        });
        ws.on('error', err => {
            let i;
            console.error('error on %s (%s)', elm, err);
            for (i = 0; i < self.writeStreams.length; i += 1) {
                if (self.writeStreams[i] === ws) {
                    self.writeStreams.splice(i, 1);
                    break;
                }
            }
        });
        ws.on('data', data => {
            if (!self.noconsole) {
                console.log('data (%s) %s', data, elm);
            }
        });
        /*
        ws.on('close', () => {
            if (!self.noconsole) {
                console.log('%s closed', elm);
            }
        });
        */
        self.writeStreams.push(ws);
    });
};

const format_string = (...args) => util.format(...args);

const loggerMap = {};


function TraceLog(options,name) {
    const self = {};
    self.level = 'error';
    self.writeStreams = [];
    self.waitStreams = [];
    self.stackindex = 1;
    self.noconsole = false;
    self.finish_need_counts = 0;
    self.finish_counts = 0;
    self.real_finish_callback = null;
    self.loggerName = name;
    self.finish_callback = err => {
        self.finish_counts += 1;
        if (err) {
            if (self.real_finish_callback !== null) {
                self.real_finish_callback(err);
            }
        }
        if (self.finish_counts === self.finish_need_counts) {
            if (self.real_finish_callback !== null) {
                if (loggerMap[name] !== undefined && loggerMap[name] !== null) {
                    delete loggerMap[name];
                }
                self.real_finish_callback(null);
            }
        }
    };
    self.finish = callback => {
        let ws;
        self.finish_need_counts = self.writeStreams.length;
        self.finish_counts = 0;
        self.real_finish_callback = callback || null;
        // var idx;
        while (self.writeStreams.length > 0) {
            ws = self.writeStreams[0];
            self.writeStreams.splice(0, 1);
            ws.end('', self.finish_callback);
        }

        if (self.finish_need_counts === 0 && callback !== null && callback !== undefined) {
            /* nothing to wait*/
            if (loggerMap[name] !== undefined && loggerMap[name] !== null) {
                delete loggerMap[name];
            }
            callback(null);
        }
    };
    self.format = '<{{title}}>:{{file}}:{{line}} {{message}}\n';
    if (typeof options.log_format === 'string' && options.log_format.length > 0) {
        self.format = options.log_format;
    }

    if (typeof options.level === 'string') {
        self.level = options.level;
    }

    if (util.isArray(options.log_files)) {
        add_write_streams(self, options.log_files, false);
    }

    if (util.isArray(options.log_appends)) {
        add_write_streams(self, options.log_appends, true);
    }

    if (typeof options.log_console === 'boolean' && !options.log_console) {
        self.noconsole = true;
    }


    self.innerLogger = tracer.console({
        format: [self.format],
        stackIndex: self.stackindex,
        transport(data) {
            if (!self.noconsole) {
                process.stderr.write(data.output);
            }
            self.writeStreams.forEach(elm => {
                elm.write(data.output);
            });
        },
    });


    self.trace = (...args) => {
        const utilstr = format_string(...args);
        self.innerLogger.trace(utilstr);
    };

    self.debug = (...args) => {
        const utilstr = format_string(...args);
        self.innerLogger.debug(utilstr);
    };

    self.info = (...args) => {
        const utilstr = format_string(...args);
        self.innerLogger.info(utilstr);
    };

    self.warn = (...args) => {
        const utilstr = format_string(...args);
        self.innerLogger.warn(utilstr);
    };

    self.error = (...args) => {
        const utilstr = format_string(...args);
        self.innerLogger.error(utilstr);
    };

    tracer.setLevel(self.level);
    return self;
}


const inner_init = (options, name) => {
    const inner_options = options || {};
    let optname = 'root';
    if (name !== undefined) {
        optname = name;
    }

    if (loggerMap[optname] !== undefined) {
        return loggerMap[optname];
    }

    loggerMap[optname] = new TraceLog(inner_options, optname);
    return loggerMap[optname];
};


module.exports.Init = (options, name) => inner_init(options, name);

module.exports.trace = (...args) => {
    const logger = inner_init({}, 'root');
    logger.trace(...args);
};

module.exports.debug = (...args) => {
    const logger = inner_init({}, 'root');
    logger.debug(...args);
};

module.exports.info = (...args) => {
    const logger = inner_init({}, 'root');
    logger.info(...args);
};

module.exports.warn = (...args) => {
    const logger = inner_init({}, 'root');
    logger.warn(...args);
};

module.exports.error = (...args) => {
    const logger = inner_init({}, 'root');
    logger.error(...args);
};


const finish_all_loggers = callback => {
    const names = loggerMap.keys();
    if (names.length > 0) {
        loggerMap[names[0]].finish(err => {
            if (err !== undefined && err !== null) {
                callback(err);
                return;
            }
            if (loggerMap[names[0]] !== undefined && loggerMap[names[0]] !== null) {
                delete loggerMap[names[0]];
            }
            finish_all_loggers(callback);
        });
    } else {
        callback(null);
    }
};

module.exports.finish = callback => {
    finish_all_loggers(callback);
};

module.exports.init_args = parser => {
    const tracelog_options = `
    {
        "+log" : {
            "appends" : [],
            "files" : [],
            "console" : true,
            "format" : "<{{title}}>:{{file}}:{{line}} {{message}}\\n"
        },
        "verbose|v" : "+"
    }
    `;
    parser.load_command_line_string(tracelog_options);
    return parser;
};

const set_attr_self_inner = (self, args, prefix) => {
    let curkey;
    let i;
    let prefixnew;
    const retself = self;

    if (typeof prefix !== 'string' || prefix.length === 0) {
        throw new Error('not valid prefix');
    }

    prefixnew = util.format('%s_', prefix);
    prefixnew = prefixnew.toLowerCase();

    const keys = Object.keys(args);
    for (i = 0; i < keys.length; i += 1) {
        curkey = keys[i];
        if (curkey.substring(0, prefixnew.length).toLowerCase() === prefixnew) {
            retself[curkey] = args[curkey];
        }
    }

    return retself;
};

module.exports.set_args = (options, name) => {
    const logopt = {};
    if (options.verbose >= 4) {
        logopt.level = 'trace';
    } else if (options.verbose >= 3) {
        logopt.level = 'debug';
    } else if (options.verbose >= 2) {
        logopt.level = 'info';
    } else if (options.verbose >= 1) {
        logopt.level = 'warn';
    } else {
        logopt.level = 'error';
    }

    set_attr_self_inner(logopt, options, 'log');
    /* console.log('logopt (%s)', util.inspect(logopt, {
        showHidden: true,
        depth: null
    }));*/
    module.exports.Init(logopt, name);
};
