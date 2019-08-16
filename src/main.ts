#!/usr/bin/env node

import CLI from './cli';
import { Webp } from './webp';
import rimraf = require('rimraf');
import { exec, isWindows, concurrent, readDir, execLongCMD } from './utils';
import { writeFileSync, unlinkSync, readdirSync, existsSync } from 'fs';

const cli = new CLI();

async function success() {
  console.log('操作成功');
}

async function updateFrame(
  file: string,
  outFile: string,
  getComposeCommand: (webp: Webp, frameDir: string) => any,
) {
  const webp = new Webp(file);
  await webp.init();

  if (webp.frames.length > 0) {
    const frameDir = await webp.extractFramesData();
    const composeCommand = await getComposeCommand(webp, frameDir);

    if (await execLongCMD(composeCommand)) {
      success();
      console.log(`output: ${outFile}`);
    }

    rimraf.sync(frameDir);
  }
}

cli
  .action('-h --help', '显示帮助', '', () => cli.help())

  .action<{ method: string; file: string; outFile: string }>(
    '-d --dispose [method] [file] [outFile]',
    'dispose-method: 0 for NONE or 1 for BACKGROUND',
    '',
    async ({ method, file, outFile = 'output.webp' }) => {
      await updateFrame(file, outFile, (webp, frameDir) => {
        return webp.createCommand({ dispose: !!method }, frameDir, outFile);
      });
    },
  )

  .action<{ quality: string; file: string; outFile: string }>(
    '-q --quality [quality] [file] [outFile]',
    'Specify the compression between 0 and 100',
    '',
    async ({ quality = 75, file, outFile = 'output.webp' }) => {
      await updateFrame(file, outFile, async (webp, frameDir) => {
        // 压缩
        const files = readdirSync(frameDir);
        await concurrent(
          files.map(file => async () => {
            console.log('TCL: doJob', file);
            const png = file.replace('webp', 'png');
            await exec(`dwebp ${frameDir}/${file} -o ${frameDir}/${png}`, true);
            await exec(
              `cwebp ${frameDir}/${png} -o ${frameDir}/${file} -q ${quality}`,
              true,
            );
          }),
        );

        return webp.createCommand({}, frameDir, outFile);
      });
    },
  )

  .action<{ file: string; outDir: string }>(
    '-e --extract-frame [file] [outDir]',
    '提取所有帧出来',
    '',
    async ({ file, outDir = 'frames' }) => {
      const webp = new Webp(file);
      await webp.init();
      await webp.extractFramesData(outDir);
      success();
    },
  )

  .action<{
    loop: string;
    outFile: string;
    frameDir: string;
    frameOpt: string;
    bgColor: string;
  }>(
    '-c --compose [frameDir] [outFile] [frameOpt] [loop] [bgColor]',
    '从多个图片合成animated webp, frameOpt与webpmux一致',
    '',
    async ({
      frameDir,
      loop = '1',
      outFile = 'out.webp',
      frameOpt = '+34+0+0+1+b',
      bgColor = '255,255,255,255',
    }) => {
      const frames = readDir(frameDir);

      if (!frames) return console.log('请输入正确的文件夹位置');

      let command = `webpmux `;

      frames.forEach((frameFile, i) => {
        command += `-frame ${frameDir}/${frameFile} ${frameOpt} `;
      });

      command += `-loop ${loop} -bgcolor ${bgColor} `;
      command += `-o ${outFile}`;

      if (await execLongCMD(command)) {
        success();
        console.log(`output: ${outFile}`);
      }
    },
  )

  .action<{ file: string }>(
    '-i --info [file]',
    '统计duration',
    '',
    async ({ file }) => {
      const webp = new Webp(file);
      await webp.init();
      const duration = webp.frames.reduce(
        (acc, frame) => acc + ~~frame.duration,
        0,
      );
      console.log(`duration: ${duration}ms`);
    },
  )

  .action<{ fps: string; file: string; outFile: string }>(
    '-f --fps [fps] [file] [outFile]',
    '修改duration, fps更好描述',
    '',
    async ({ fps, file, outFile = 'output.webp' }) => {
      const duration = Math.round(1000 / parseFloat(fps));
      await updateFrame(file, outFile, (webp, frameDir) => {
        return webp.createCommand({ duration }, frameDir, outFile);
      });
    },
  )

  .action(
    'awebp -d 0 ./test/test.webp',
    '// 设置webp每帧的dispose method为0',
    'Examples',
  )
  .action(
    'awebp -q 60 ./test/test.webp',
    '// 设置动图webp压缩率, 提取帧->转png->重新拼接webp',
    'Examples',
  )
  .action(
    'awebp -e ./test/test.webp frames',
    '// 提取所有帧出来到frames文件夹',
    'Examples',
  )
  .action(
    'awebp -c frames out.webp +34+0+0+1+b 1 255,255,255,255',
    '// 从frames文件夹合成webp',
    'Examples',
  )
  .action(
    'awebp -i ./test/test.webp',
    '// 统计出animated webp duration',
    'Examples',
  )
  .action(
    'awebp -f 60 ./test/test.webp',
    '// 修改 animated webp duration (60fps ~= 17)',
    'Examples',
  )

  .run(process.argv.slice(2));
