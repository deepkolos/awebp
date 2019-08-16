import * as fs from 'fs';
import * as shell from 'child_process';

let setCharPage = false;

export const isWindows = !!~(process.env.OS || '')
  .toLowerCase()
  .indexOf('windows');

export function exec(cmd: string, ignoreError?: boolean): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (!setCharPage) {
      await new Promise(resolveCharPage =>
        shell.exec('chcp 65001', () => resolveCharPage()),
      );
      setCharPage = true;
    }

    shell.exec(cmd, (err, stdout, stderr) => {
      if (ignoreError) resolve(stdout);
      else if (err || stderr) reject(err || stderr);
      else resolve(stdout);
    });
  });
}

export function concurrent(jobs: Array<() => any>, threadNum: number = 10) {
  return new Promise((resolve, reject) => {
    jobs = [...jobs];
    let doing = 0;

    const doJob = async () => {
      const job = jobs.shift();
      doing++;
      try {
        job && (await job());
        doing--;
      } catch (error) {
        reject('job error');
      }

      if (jobs.length) doJob();
      else if (doing === 0) resolve();
    };

    for (let i = 0, len = Math.min(threadNum, jobs.length); i < len; i++)
      doJob();
  });
}

export function readDir(dir: string) {
  try {
    return fs
      .readdirSync(dir)
      .sort((a, b) => a.localeCompare(b, 'kn', { numeric: true }));
  } catch (error) {
    return null;
  }
}

export async function execLongCMD(cmd: string) {
  if (isWindows) {
    // windows cmd 有命令最长有8k char 限制, 所以使用powershell来执行命令
    const ps1 = 'longCMD.ps1';
    fs.writeFileSync(ps1, cmd);

    try {
      await exec(`powershell -f ${ps1}`);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    } finally {
      fs.unlinkSync(ps1);
    }
  } else {
    try {
      await exec(cmd);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
