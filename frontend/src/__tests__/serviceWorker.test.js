import { unregister } from '../serviceWorker';

describe('service worker cleanup', () => {
  let originalServiceWorker = null;

  beforeEach(() => {
    originalServiceWorker = Object.getOwnPropertyDescriptor(
      navigator,
      'serviceWorker'
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
    } else {
      delete navigator.serviceWorker;
    }
    vi.restoreAllMocks();
  });

  test('unregisters all existing workers', async () => {
    const registrations = [
      { unregister: vi.fn().mockResolvedValue(true) },
      { unregister: vi.fn().mockResolvedValue(true) },
    ];
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue(registrations) },
    });

    unregister();
    await Promise.resolve();
    await Promise.resolve();

    expect(registrations[0].unregister).toHaveBeenCalledTimes(1);
    expect(registrations[1].unregister).toHaveBeenCalledTimes(1);
  });

  test('logs failures while retrieving registrations', async () => {
    const error = new Error('registration lookup failed');
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockRejectedValue(error) },
    });

    unregister();
    await Promise.resolve();
    await Promise.resolve();

    expect(console.error).toHaveBeenCalledWith(
      'Error unregistering service workers:',
      error
    );
  });

  test('does nothing when service workers are unsupported', () => {
    delete navigator.serviceWorker;

    expect(() => unregister()).not.toThrow();
  });
});
