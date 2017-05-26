import test from 'ava';
import * as jslog from '../lib';
import * as mktemp from 'mktemp';
import { exec  } from 'child-process-promise';
import * as path from 'path';
import * as util from 'util';

const match_expr_lines = (lines,matchexprs) => {
	t.truthy(lines.length === matchexprs.length , util.format('%s === %s', lines.length, matchexprs.length));
	for (let idx=0 ;idx < lines.length; idx += 1) {
		let curline = lines[idx];
		
	}
	return ;
};

test.cb('to get console out',t => {
	// now to give the coding for out
	const topdir = path.normalize(__dir + path.sep + '..');
	const consolebin = path.normalize( topdir + path.sep + 'libexample' + path.sep + 'console' + path.sep + 'console.js');
	const cmd = util.format('node "%s" "hello" "world"', consolebin);
	exec(cmd)
		.then( res => {
			const lines = res.stderr.toString().split('\n');
			match_expr_lines(lines,['*hello$','*world$']);
			t.end();
		})
		.catch( err => {
			console.error('can not run [%s]', cmd);
		})

});