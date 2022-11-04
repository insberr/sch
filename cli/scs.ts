import { existsSync, WriteStream } from 'fs';
import { opendir, readdir, readFile, stat, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { SCS } from '..';
let args = process.argv.slice(2);

const commands = ['prettyMany', 'pretty', 'minifyMany', 'minify', 'exec', 'parse'];

function usage() {
    console.log('SCS-CLI v0.0.0');
    console.log('Usage:');
    console.log();
    console.log('scs prettyMany [...files]');
    console.log('prettifies many files in place');
    console.log();
    console.log('scs pretty <infile> [outfile]');
    console.log('prettify a single file');
    console.log();
    console.log('scs minifyMany [...files]');
    console.log('minifies many files in place');
    console.log();
    console.log('scs minify <infile> [outfile]');
    console.log('minifies a single file');
    console.log();
    console.log('scs exec <infile> [outfile] [...args]');
    console.log('executes infile, writes the output context to outfile. specify args in key=value, spaces not supported');
    console.log('example: scs exec in.scs out.json grade=10 name=weckysmecky');
    console.log();
    console.log('scs parse <infile> [outfile]');
    console.log('parses infile and outputs the parsed tree to outfile');
    console.log();
}

async function resolve(arg: string[]): Promise<string[]> {
    const e: string[] = [];
    let i = 0;
    while (i < arg.length) {
        const pat = arg[i];
        //console.log(pat);
        const info = await stat(pat);
        if (info.isDirectory()) {
            //console.log('directory');
            const dir = await readdir(pat);
            //console.log(dir);
            arg = [...arg, ...dir.map((f) => join(pat, f))];
            //console.log(arg);
        }
        if (info.isFile()) {
            //console.log('file');
            if (extname(pat) == '.scs') {
                e.push(pat);
            }
        }
        i++;
    }
    return e;
}

async function operate(inf: string, outf: string, fn: (data: string) => Promise<string>) {
    if (!existsSync(inf)) {
        throw new Error('infile doesnt exist!');
    }
    const data = await readFile(inf, 'utf-8');
    const start = performance.now();
    const retd = await fn(data);
    const end = performance.now();
    if (outf == '-') {
        process.stdout.write(retd);
        return -1;
    }
    await writeFile(outf, retd);
    return end - start;
}

async function main(command?: string) {
    if (!commands.includes(command || 'undefined')) {
        usage();
        return;
    }
    if (command == 'minify') {
        const infile = args.shift();
        const outfile = args.shift() || '-';
        if (!infile) {
            usage();
            return;
        }
        const end = await operate(infile, outfile, async (dt) => {
            const f = new SCS(dt);
            return f.minify();
        });
        if (end != -1) {
            console.log('Minified', infile, 'in', end.toFixed(2), 'ms');
        }
    } else if (command == 'pretty') {
        const infile = args.shift();
        const outfile = args.shift() || '-';
        if (!infile) {
            usage();
            return;
        }
        const end = await operate(infile, outfile, async (dt) => {
            const f = new SCS(dt);
            return f.pretty();
        });
        if (end != -1) {
            console.log('Prettified', infile, 'in', end.toFixed(2), 'ms');
        }
    } else if (command == 'parse') {
        const infile = args.shift();
        const outfile = args.shift() || '-';
        if (!infile) {
            usage();
            return;
        }
        const end = await operate(infile, outfile, async (dt) => {
            const f = new SCS(dt);
            return JSON.stringify(f.parsed, null, 2);
        });
        if (end != -1) {
            console.log('Parsed', infile, 'in', end.toFixed(2), 'ms');
        }
    } else if (command == 'exec') {
        const infile = args.shift();
        const outfile = args.shift() || '-';
        const _arg = args.map((n) => {
            const [key, _value] = n.split('=');
            const value = JSON.parse(_value);
            return [key, value];
        });
        const arg: any = {};
        _arg.forEach((n) => {
            arg[n[0]] = n[1];
        });
        //console.log(arg);
        if (!infile) {
            usage();
            return;
        }
        const end = await operate(infile, outfile, async (dt) => {
            const f = new SCS(dt);
            return JSON.stringify(f.exec(arg), null, 2);
        });
        if (end != -1) {
            console.log('Executed', infile, 'in', end.toFixed(2), 'ms');
        }
    } else if (command == 'minifyMany') {
        const files = await resolve([...args]);
        args = [];
        for (const fl of files) {
            args = [fl, fl];
            await main('minify');
        }
    } else if (command == 'prettyMany') {
        const files = await resolve([...args]);
        args = [];
        for (const fl of files) {
            args = [fl, fl];
            await main('pretty');
        }
    } else {
        usage();
    }
}
//console.log(args);
main(args.shift());
