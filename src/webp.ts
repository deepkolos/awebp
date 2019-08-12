import * as path from 'path';
import * as fs from 'fs';
import { exec, concurrent } from './utils';

interface Frame {
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
    const lines = out.split('\r').map((i: string) => i.trim());
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
        no: parseInt(no, 10), width, height, alpha, xOffset, yOffset, duration, dispose: dispose === 'yes', blend: blend === 'yes', imageSize, compression,
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

  async extractFramesData(outDir?: string) {
    const { filePath, frames } = this;
    const dir = outDir || fs.mkdtempSync('webp');

    if (outDir) fs.mkdirSync(outDir, { recursive: true });

    await concurrent(
      frames.map((frame, i) => () =>
        exec(
          `webpmux -get frame ${i} ${filePath} -o ${dir}/frame-${i}.webp`,
          true,
        ),
      ),
    );

    return dir;
  }

  createCommand(
    options: {
      blend?: Boolean;
      dispose?: Boolean;
    },
    frameDir: string,
    outFile: string = 'output.webp',
  ) {
    const { dispose, blend } = options;
    const { frames, loopCount, backgroundColorARGB } = this;

    let blendOpt: string;
    let disposeOpt: string;
    let command = `webpmux `;

    frames.forEach((frame, i) => {
      blendOpt = (blend !== undefined ? blend : frame.blend) ? '+b' : '-b';
      disposeOpt = (dispose !== undefined
      ? dispose
      : frame.dispose)
        ? '1'
        : '0';
      if (i !== frames.length)
        command += `-frame ${frameDir}/frame-${i}.webp +${frame.duration}+${
          frame.xOffset
        }+${frame.yOffset}+${disposeOpt}${blendOpt} `;
    });

    command += `-loop ${loopCount} -bgcolor ${backgroundColorARGB.join(',')} `;
    command += `-o ${outFile}`;

    return command;
  }
}
