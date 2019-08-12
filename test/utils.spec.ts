import { concurrent } from '../src/utils';

describe('utils', () => {
  test('concurrent', async () => {
    const res: number[] = [];
    const jobs = [1, 2, 3, 4, 5, 6].map(i => () => res.push(i));

    await concurrent(jobs, 3);

    console.log(res);
  });
});
