import { SCS, SCSFS, _checkers, _statements } from '../src/scs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readFile } from 'fs/promises';
//mport { serialize } from "@ungap/structured-clone";
const testFile = readFileSync(__dirname + '/../examples/main.ex.scs', 'utf8');
const testDir = __dirname + '/../testOut/';
if (!existsSync(testDir)) {
    mkdirSync(testDir);
}

test('parse', () => {
    const scs = new SCS(testFile);
    writeFileSync(
        join(testDir, 'test.ignore.json'),
        JSON.stringify(scs.parsed, null, 2)
    );
});

describe('minify', () => {
    test('minify', () => {
        const scs = new SCS(testFile);
        const minified = scs.minify();
        writeFileSync(join(testDir, 'test.min.scs'), minified);
        const minscs = new SCS(minified);
        writeFileSync(
            join(testDir, 'test.min.ignore.json'),
            JSON.stringify(minscs.parsed, null, 2)
        );
        //expect(minscs.parsed).toEqual(scs.parsed);
    });

    test('minify keep multiline comments', () => {
        // ! Make this actually test that it did what its supposed to do
        const scs = new SCS(testFile);
        const minified = scs.minify({ keepMultiLineComments: true });
        writeFileSync(
            join(testDir, 'test.min.keep.block.comments.scs'),
            minified
        );
        const minscs = new SCS(minified);
        writeFileSync(
            join(testDir, 'test.min.keep.block.comments.ignore.json'),
            JSON.stringify(minscs.parsed, null, 2)
        );
        //expect(minscs.parsed).toEqual(scs.parsed);
    });

    // ! add keep single line comments test
});

test('pretty', () => {
    const scs = new SCS(testFile);
    const pretty = scs.pretty();
    writeFileSync(join(testDir, 'test.pretty.scs'), pretty);
    const minscs = new SCS(pretty);
    writeFileSync(
        join(testDir, 'test.pretty.ignore.json'),
        JSON.stringify(minscs.parsed, null, 2)
    );
    //expect(minscs.parsed).toEqual(scs.parsed);
});

test('minify pretty', () => {
    const scs = new SCS(testFile);
    const minified = scs.minify();
    const scsMin = new SCS(minified);
    const pretty = scsMin.pretty();
    writeFileSync(join(testDir, 'test.min.pretty.scs'), pretty);
    const minscs = new SCS(pretty);
    writeFileSync(
        join(testDir, 'test.min.pretty.ignore.json'),
        JSON.stringify(minscs.parsed, null, 2)
    );
    //expect(minscs.parsed).toEqual(scs.parsed);
});

test('exec', () => {
    const scs = new SCS(testFile);
    const execed = scs.exec();
    //console.dir(execed,{depth:32})
    writeFileSync(
        join(testDir, 'test.exec.json'),
        JSON.stringify(execed, null, 2)
    );
});

test('scsfs', async () => {
    const fs = new SCSFS();
    const manifest = {
        // key: filename, value: value passed to fetcher to get the content (ie url)
        'main.ex.scs': 'entrypoint.ex.scs',
        'defines.ex.scs': 'defines.ex.scs',
        'events.ex.scs': 'events.ex.scs',
        'functions.ex.scs': 'functions.ex.scs',
        'schedules.ex.scs': 'schedules.ex.scs',
        'lunches.ex.scs': 'lunches.ex.scs',
    };
    await fs.addAsync(manifest, (fl) => {
        return readFile(
            join(__dirname, '../examples', 'importexample', fl),
            'utf8'
        ); // read from the funny directory
    });
    const execed = fs.exec('main.ex.scs');
    writeFileSync(
        join(testDir, 'test.fs.exec.json'),
        JSON.stringify(execed, null, 2)
    );
});

test('linty', () => {
    const scs = new SCS(testFile);
    const linty = scs.lint();
    writeFileSync(
        join(testDir, 'test.linty.json'),
        JSON.stringify(linty, null, 2)
    );
});

describe('quotes: message', () => {
    describe('no quotes insde', () => {
        test('single', () => {
            const scs = new SCS(`message 'single quotes';`);
            expect(scs.pretty()).toEqual(`message 'single quotes';\n`);
        });

        test('double', () => {
            const scs = new SCS(`message "double quotes";`);
            expect(scs.pretty()).toEqual(`message 'double quotes';\n`);
        });
    });

    describe("single quotes inside single quotes ('msg \\'hi\\' more')", () => {
        test('both escaped single', () => {
            const scs = new SCS(`message 'Test \\'single quotes\\' message';`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\'single quotes\\' message';\n`
            );
        });

        test('first escaped single', () => {
            expect(() => {
                new SCS(`message 'Test \\'single quotes' message';`);
            }).toThrowError();
        });

        test('last escaped single', () => {
            expect(() => {
                new SCS(`message 'Test 'single quotes\\' message';`);
            }).toThrowError();
        });

        test('none escaped single', () => {
            /*
                the non escaped quotes makes it so you get:
                message 'Test ' single quotes ' message'; when prettyfied
                as in <string> <value> <string>

                and
                message: 'Test  single quotes  message' when execed

                Love the quirks of this language already
            */
            const value = new SCS(`message 'Test 'single quotes' message';`);
            expect(value.exec()).toEqual({
                message: 'Test  single quotes  message',
            });
            expect(value.pretty()).toEqual(
                `message 'Test ' single quotes ' message';\n`
            );

            // cringe
            const value2 = new SCS(value.pretty());
            expect(value2.exec()).toEqual({
                message: 'Test  single quotes  message',
            });
            expect(value2.pretty()).toEqual(
                `message 'Test ' single quotes ' message';\n`
            );
        });

        test('not closed single escaped', () => {
            const scs = new SCS(`message 'Test \\'single quotes message';`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\'single quotes message';\n`
            );
        });
    });

    describe('double quotes inside double quotes ("msg \\"hi\\" more")', () => {
        test('both escaped double', () => {
            const scs = new SCS(`message "Test \\"double quotes\\" message";`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\"double quotes\\" message';\n`
            );
        });

        test('first escaped double', () => {
            expect(() => {
                new SCS(`message "Test \\"double quotes" message";`);
            }).toThrowError();
        });

        test('last escaped double', () => {
            expect(() => {
                new SCS(`message "Test "double quotes\\" message";`);
            }).toThrowError();
        });

        test('none escaped double', () => {
            /*
                the non escaped quotes makes it so you get:
                message "Test " double quotes " message"; when prettyfied
                as in <string> <value> <string>

                and
                message: 'Test  double quotes  message' when execed

                Love the quirks of this language already
            */
            const value = new SCS(`message "Test "double quotes" message";`);
            expect(value.exec()).toEqual({
                message: 'Test  double quotes  message',
            });
            expect(value.pretty()).toEqual(
                `message 'Test ' double quotes ' message';\n`
            );

            // cringe
            const value2 = new SCS(value.pretty());
            expect(value2.exec()).toEqual({
                message: 'Test  double quotes  message',
            });
            expect(value2.pretty()).toEqual(
                `message 'Test ' double quotes ' message';\n`
            );
        });

        test('not closed double escaped', () => {
            const scs = new SCS(`message "Test \\"double quotes message";`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\"double quotes message';\n`
            );
        });
    });

    describe('single quotes inside double quotes ("msg \\\'hi\\\' more")', () => {
        test('both escaped', () => {
            const scs = new SCS(`message "Test \\'single quotes\\' message";`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\'single quotes\\' message';\n`
            );
        });

        test('first escaped', () => {
            const scs = new SCS(`message "Test \\'single quotes' message";`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\'single quotes\\' message';\n`
            );
        });

        test('last escaped', () => {
            const scs = new SCS(`message "Test 'single quotes\\' message";`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\'single quotes\\' message';\n`
            );
        });

        test('none escaped', () => {
            const value = new SCS(`message "Test 'single quotes' message";`);
            expect(value.pretty()).toEqual(
                `message 'Test \\'single quotes\\' message';\n`
            );
        });

        test('not closed escaped', () => {
            const scs = new SCS(`message "Test \\'single quotes message";`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\'single quotes message';\n`
            );
        });
    });

    describe('double quotes inside single quotes (\'msg \\"hi\\" more\')', () => {
        test('both escaped', () => {
            const scs = new SCS(`message 'Test \\"double quotes\\" message';`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\"double quotes\\" message';\n`
            );
        });

        test('first escaped', () => {
            const scs = new SCS(`message 'Test \\"double quotes" message';`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\"double quotes\\" message';\n`
            );
        });

        test('last escaped', () => {
            const scs = new SCS(`message 'Test "double quotes\\" message';`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\"double quotes\\" message';\n`
            );
        });

        test('none escaped', () => {
            const value = new SCS(`message 'Test "double quotes" message';`);
            expect(value.pretty()).toEqual(
                `message 'Test \\"double quotes\\" message';\n`
            );
        });

        test('not closed escaped', () => {
            const scs = new SCS(`message 'Test \\"double quotes message';`);
            expect(scs.pretty()).toEqual(
                `message 'Test \\"double quotes message';\n`
            );
        });
    });
});

describe('scheduleFor', () => {
    it('should work with scs', () => {
        const scs = new SCS(testFile);
        const execed = scs.scheduleFor(new Date('November 9, 2022'));
        writeFileSync(
            join(testDir, 'test.scheduleFor.11-9-2022.exec.json'),
            JSON.stringify(execed, null, 2)
        );
        //console.dir(execed,{depth:32})
    });
    it('should work with scsfs', async () => {
        const fs = new SCSFS();
        const manifest = {
            // key: filename, value: value passed to fetcher to get the content (ie url)
            'main.ex.scs': 'entrypoint.ex.scs',
            'defines.ex.scs': 'defines.ex.scs',
            'events.ex.scs': 'events.ex.scs',
            'functions.ex.scs': 'functions.ex.scs',
            'schedules.ex.scs': 'schedules.ex.scs',
            'lunches.ex.scs': 'lunches.ex.scs',
        };
        await fs.addAsync(manifest, (fl) => {
            return readFile(
                join(__dirname, '../examples', 'importexample', fl),
                'utf8'
            ); // read from the funny directory
        });
        const execed = fs.scheduleFor(
            'main.ex.scs',
            new Date('November 9, 2022')
        );
        writeFileSync(
            join(testDir, 'test.scheduleFor.scsfs.11-9-2022.exec.json'),
            JSON.stringify(execed, null, 2)
        );
        //console.dir(execed,{depth:32})
    });
});

it('should bundle', async () => {
    const fs = new SCSFS();
    const manifest = {
        // key: filename, value: value passed to fetcher to get the content (ie url)
        'main.ex.scs': 'entrypoint.ex.scs',
        'defines.ex.scs': 'defines.ex.scs',
        'events.ex.scs': 'events.ex.scs',
        'functions.ex.scs': 'functions.ex.scs',
        'schedules.ex.scs': 'schedules.ex.scs',
        'lunches.ex.scs': 'lunches.ex.scs',
    };
    await fs.addAsync(manifest, (fl) => {
        return readFile(
            join(__dirname, '../examples', 'importexample', fl),
            'utf8'
        ); // read from the funny directory
    });
    const bundle = fs.bundle('main.ex.scs');
    writeFileSync(join(testDir, 'test.bundle.scs'), bundle);
});

it('all statements should have checkers', () => {
    _statements.forEach((statement) => {
        expect(Array.from(_checkers.keys())).toContain(statement);
    });
});
