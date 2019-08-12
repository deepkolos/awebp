import CLI from '../src/cli';
import mockConsole from 'jest-mock-console';

const cli = new CLI();

const logOptions = (e: Object) => console.log(JSON.stringify(e));

cli
  .action('-h --help', '显示帮助', '', () => cli.help())
  .action('-l --list [?key]', '列出环境变量', '', logOptions)
  .action(
    '-e --edit [key] [operator] [value]',
    '编辑环境变量path路径',
    '',
    logOptions,
  )

  .action('-lp --list-path', '= -l Path', 'Alias', logOptions)
  .action(
    '-a --add-path [value]',
    '= -e Path push [value]',
    'Alias',
    logOptions,
  )
  .action(
    '-p --push [key] [value]',
    '= -e [key] push [value]',
    'Alias',
    logOptions,
  )
  .action(
    '-s --set [key] [value]',
    '= -e [key] set [value]',
    'Alias',
    logOptions,
  )
  .action(
    '-r --remove [key] [?index]',
    '= -e [key] remove [?index]',
    'Alias',
    logOptions,
  )
  .action(
    '-us --unshift [key] [value]',
    '= -e [key] unshift [value]',
    'Alias',
    logOptions,
  )

  .action(
    "env-mgr -e Path push 'D:\\DEV\\Android'",
    '// path增加路径',
    'Examples',
  )
  .action('env-mgr -e DEPOT_TOOLS_WIN_TOOLCHAIN set 0', '// 设置值', 'Examples')

  .debug();

describe('CLI', () => {
  test('-h', () => {
    const restoreConsole = mockConsole();
    cli.run(['-h']);
    // @ts-ignore
    const output = console.log.mock.calls.map(i => i.join('')).join('\n');
    expect(output).not.toBe('');
    restoreConsole();
  });

  test('--help', () => {
    const restoreConsole = mockConsole();
    cli.run(['--help']);
    // @ts-ignore
    const output = console.log.mock.calls.map(i => i.join('')).join('\n');
    expect(output).not.toBe('');
    restoreConsole();
  });

  test('-l', () => {
    const restoreConsole = mockConsole();
    cli.run(['-l']);
    // @ts-ignore
    const output = console.log.mock.calls.map(i => i.join('')).join('\n');
    expect(output).toBe('{}');
    restoreConsole();
  });

  test('-l a', () => {
    const restoreConsole = mockConsole();
    cli.run(['-l', 'a']);
    // @ts-ignore
    const output = console.log.mock.calls.map(i => i.join('')).join('\n');
    expect(JSON.parse(output)).toStrictEqual({ key: 'a' });
    restoreConsole();
  });

  test('-e key op value', () => {
    const restoreConsole = mockConsole();
    cli.run(['-e', 'key', 'op', 'value']);
    // @ts-ignore
    const output = console.log.mock.calls.map(i => i.join('')).join('\n');
    expect(JSON.parse(output)).toStrictEqual({
      key: 'key',
      operator: 'op',
      value: 'value',
    });
    restoreConsole();
  });

  test('-unknown key op value', () => {
    const restoreConsole = mockConsole();
    const args = ['-unknown', 'key', 'op', 'value'];
    cli.run(args);
    // @ts-ignore
    const output = console.log.mock.calls.map(i => i.join('')).join('\n');
    expect(output).toBe(`未知命令: ${args.join(' ')}`);
    restoreConsole();
  });
});
