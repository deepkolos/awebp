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

    const doJob = async () => {
      const job = jobs.shift();

      try {
        job && (await job());
      } catch (error) {
        reject('job error');
      }

      if (jobs.length) doJob();
      else resolve();
    };

    for (let i = 0, len = Math.min(threadNum, jobs.length); i < len; i++)
      doJob();
  });
}
