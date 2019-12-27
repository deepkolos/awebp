import * as Jimp from 'jimp';
// import Jimp from 'jimp';
import * as fs from 'fs';
import { EOL } from 'os';
import { exec, concurrent, defVal } from './utils';

export interface Frame {
  no: number;
  width: string;
  height: string;
  alpha: string;
  xOffset: string;
  yOffset: string;
  duration: string;
  dispose: Boolean;
  blend: Boolean;
  imageSize: string;
  compression: string;
}

type RGBA = [number, number, number, number];

const defaultRGBA: RGBA = [255, 255, 255, 255];

export class Webp {
  public filePath: string = '';
  public frames: Frame[] = [];
  public loopCount: number = 0;
  public canvasSize: string = '';
  public numberOfFrames: number = 0;
  public featuresPresent: string = '';
  public backgroundColor: string = '';
  public backgroundColorARGB: RGBA = defaultRGBA;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async init() {
    const out = await exec(`webpmux -info ${this.filePath}`);
    // console.log('TCL: out', out);
    const lines = out.split(EOL);
    // console.log('TCL: lines', lines);
    const valueOfLine = (lineNum: number) =>
      lines[lineNum].split(':')[1].trim();
    const line2 = lines[2].split('  ');

    const canvasSize = valueOfLine(0);
    const featuresPresent = valueOfLine(1);
    const backgroundColor = line2[0].split(' : ')[1];
    const loopCount = parseInt(line2[1].split(' : ')[1], 10);
    const numberOfFrames = parseInt(valueOfLine(3), 10);
    const frames: Frame[] = lines.slice(5).map((line: string) => {
      // prettier-ignore
      const [
        no, width, height, alpha, xOffset, yOffset, duration, dispose, blend, imageSize, compression,
      ] = line.split(' ').filter((v: string) => v !== '');

      // prettier-ignore
      return {
        no: parseInt(no, 10), width, height, alpha, xOffset, yOffset, duration, dispose: dispose === 'background', blend: blend === 'yes', imageSize, compression,
      };
    });
    frames.length = numberOfFrames;

    const backgroundColorARGBMatch = backgroundColor
      .slice(2)
      .match(/([0-9a-z]{2})([0-9a-z]{2})([0-9a-z]{2})([0-9a-z]{2})/i);
    const backgroundColorARGB = (backgroundColorARGBMatch
      ? backgroundColorARGBMatch
          .slice(1, 5)
          .map((hex: string) => parseInt(hex, 16))
      : defaultRGBA) as RGBA;

    this.frames = frames;
    this.loopCount = loopCount;
    this.canvasSize = canvasSize;
    this.numberOfFrames = numberOfFrames;
    this.featuresPresent = featuresPresent;
    this.backgroundColor = backgroundColor;
    this.backgroundColorARGB = backgroundColorARGB;
  }

  async extractFramesData(outDir?: string, fillFrame?: boolean) {
    const { filePath, frames } = this;
    const dir = outDir || fs.mkdtempSync('webp');

    if (outDir) fs.mkdirSync(outDir, { recursive: true });

    await concurrent(
      frames.map((frame, i) => () =>
        exec(
          `webpmux -get frame ${i + 1} ${filePath} -o ${dir}/frame-${i}.webp`,
          true,
        ),
      ),
    );

    if (fillFrame) {
      await concurrent(
        frames.map((frame, i) => () => this.fillFrame(dir, frame, i)),
      );
    } else if (frames[0]) {
      // 单独处理第一帧还原canvas size
      await this.fillFrame(dir, frames[0], 0);
    }

    return dir;
  }

  async fillFrame(dir: string, frame: Frame, i: number) {
    await exec(`dwebp ${dir}/frame-${i}.webp -o ${dir}/frame-${i}.png`, true);
    // @ts-ignore
    const origin = await Jimp.read(`${dir}/frame-${i}.png`);
    const [width, height] = this.canvasSize.split('x').map(i => ~~i.trim());
    const { xOffset, yOffset } = frame;
    // @ts-ignore
    const img = new Jimp(width, height, 0x0);
    img.composite(origin, parseInt(xOffset, 10), parseInt(yOffset, 10));
    await img.writeAsync(`${dir}/frame-${i}.png`);
    try {
      await exec(
        `cwebp ${dir}/frame-${i}.png -o ${dir}/frame-${i}.webp`,
        false,
      );
    } catch (error) {
      if (error.toString().indexOf('Saving file') === -1) {
        console.log('TCL: Webp -> fillFrame -> error', error);
        throw error;
      }
    }
    frame.xOffset = '0';
    frame.yOffset = '0';
  }

  createCommand(
    options: {
      loop?: number;
      blend?: Boolean;
      bgColor?: string;
      dispose?: Boolean;
      duration?: number;
    },
    frameDir: string,
    outFile: string = 'output.webp',
  ) {
    const { dispose, blend, duration, loop, bgColor } = options;
    const { frames, loopCount, backgroundColorARGB } = this;

    let blendOpt: string;
    let disposeOpt: string;
    let durationOpt: number;
    let command = `webpmux `;
    const loopOpt = defVal(loop, loopCount);
    const bgColorOpt = defVal(bgColor, backgroundColorARGB.join(','));
    frames.forEach((frame, i) => {
      blendOpt = (blend !== undefined ? blend : frame.blend) ? '+b' : '-b';
      disposeOpt = (dispose !== undefined
      ? dispose
      : frame.dispose)
        ? '1'
        : '0';
      durationOpt =
        duration === undefined ? parseInt(frame.duration, 10) : duration;

      // 这里导致复用性降低, 有耦合
      command += `-frame ${frameDir}/frame-${i}.webp +${durationOpt}+${frame.xOffset}+${frame.yOffset}+${disposeOpt}${blendOpt} `;
    });

    command += `-loop ${loopOpt} -bgcolor ${bgColorOpt} `;
    command += `-o ${outFile}`;

    return command;
  }
}
