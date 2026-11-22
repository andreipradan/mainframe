describe('API server configuration', () => {
  test('uses the Vite API URL outside localhost', async () => {
    vi.resetModules();
    vi.doMock('../serviceWorker', () => ({ isLocalhost: false }));

    const { API_SERVER } = await import('../constants');

    expect(API_SERVER).toBe(`${import.meta.env.VITE_API_URL}/`);
  });
});
