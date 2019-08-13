#!/usr/bin/env node

import CLI from './cli';
import { Webp } from './webp';
import rimraf = require('rimraf');
import { exec, isWindows, concurrent } from './utils';
import { writeFileSync, unlinkSync, readdirSync } from 'fs';

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

    if (isWindows) {
      // windows cmd 有命令最长有8k char 限制, 所以使用powershell来执行命令
      const ps1 = 'composeWEBP.ps1';
      console.log('success extract frames');
      writeFileSync(ps1, composeCommand);
      console.log('TCL: composeCommand', composeCommand);

      try {
        await exec(`powershell -f ${ps1}`);
      } catch (e) {
        console.log(e);
      } finally {
        unlinkSync(ps1);
        rimraf.sync(frameDir);
      }
    } else {
      try {
        await exec(composeCommand);
      } catch (e) {
        console.log(e);
      } finally {
        rimraf.sync(frameDir);
      }
    }

    success();
    console.log(`output: ${outFile}`);
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

        return webp.createCommand({ dispose: true }, frameDir, outFile);
      });
    },
  )

  .action<{ file: string; outDir: string }>(
    '-e --extract-frame [file] [outDir]',
    '提取帧出来',
    '',
    async ({ file, outDir = 'frames' }) => {
      const webp = new Webp(file);
      await webp.init();
      await webp.extractFramesData(outDir);
      success();
    },
  )

  .action(
    'awebp -d 0 ./test/test.webp',
    '// 设置webp每帧的dispose method为0',
    'Examples',
  )
  .action(
    'awebp -q 75 ./test/test.webp',
    '// 设置动图webp压缩率, 提取帧->转png->重新拼接webp',
    'Examples',
  )
  .action(
    'awebp -e ./test/test.webp frames',
    '// 提取所有帧出来到frames文件夹',
    'Examples',
  )

  .run(process.argv.slice(2));
