describe('main', () => {
  test('should run in windows', async () => {
    const isWindows = !!~(process.env.OS || '')
      .toLowerCase()
      .indexOf('windows');
    expect(isWindows).toBe(true);
  });
});
