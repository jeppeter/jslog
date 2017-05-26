import * as mktemp from 'mktemp';
import * as fs from 'fs';
import * as extargsparse from 'extargsparse';

class PublicTest {
    constructor() {
        this.x = 0;
    }
    truthy(bval, notic) {
        if (!(bval)) {
            console.error('%s', notic);
        }
        this.x += 1;
    }

    end() {
        this.x += 1;
        console.log('end');
    }
}

const range = n => Array.from(Array(n).keys());

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

const commandline = `
    {
        "count|c" : 1,
        "$" : 1
    }
`;

const parser = extargsparse.ExtArgsParse();
parser.load_command_line_string(commandline);
const args = parser.parse_command_line();

const t = new PublicTest();

Promise.all(
        range(args.count).map(() =>
            create_file(t, args.args[0]))
    )
    .then(f => {
        console.log('files %s', totalfiles);
        console.log('f %s', f);
        Promise.all(
            totalfiles.map(f2 => delete_file(t, f2))
            )
        .then(() => {
            t.end();
        });
    });
