import * as fs from 'fs';
import * as path from 'path';
import { Webp } from '../src/webp';

const p = (str: string) => path.resolve(__dirname, str);

describe('webp', () => {
  test('correct file', () => {
    const webp = new Webp(p('./test.webp'));
    expect(async () => {
      await webp.init();
    }).not.toThrowError();
  });

  test("file doesn't exist", async () => {
    // Error: Command failed: webpmux -info D:\DEV\Github\opensource\set-animated-webp-frame-option\test\file-not-exist.webp
    // cannot open input file 'D:\DEV\Github\opensource\set-animated-webp-frame-option\test\file-not-exist.webp'

    // TCL: error Error: Command failed: webpmux -info
    // ERROR: Too few arguments for '-info'.
    // ERROR: No action specified.
    // Exiting due to command-line parsing error.

    // TCL: error Error: Command failed: webpmux -info D:\DEV\Github\opensource\set-animated-webp-frame-option\test\test.gif
    // Failed to create mux object from file D:\DEV\Github\opensource\set-animated-webp-frame-option\test\test.gif.

    const webpPathEmpty = new Webp('');
    const webpFormatError = new Webp('./test.gif');
    const webpNotExist = new Webp(p('./file-not-exist.webp'));

    const expectError = async (webp: Webp, matchError: RegExp) => {
      try {
        await webp.init();
      } catch (error) {
        error = error.toString();
        console.log('TCL: error', error);

        const hasError = error.match(matchError);
        expect(hasError).not.toBe(null);
      }
    };
    expectError(webpPathEmpty, /cannot open input file/);

    expectError(webpNotExist, /Too few arguments for \'-info\'/);
    expectError(webpFormatError, /Failed to create mux object from file/);
  });

  test('extract webp', async () => {
    const webp = new Webp('./test.webp');
    await webp.init();
    const dir = await webp.extractFramesData();
    const files = fs.readdirSync(dir);
    expect(files.length === webp.frames.length).toBe(true);
  });
});
