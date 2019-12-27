import { Frame } from './webp';

export class APng {
  createCommandFromWebpFrame(
    options: {
      loop?: number;
    },
    frames: Array<Frame>,
    frameDir: string,
    outFile: string = 'output.png',
  ) {

    let command = `apngasm ${outFile} `;
  }
}
