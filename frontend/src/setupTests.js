import { vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

window.scrollTo = vi.fn();

if (window.L === undefined) {
  window.L = {
    Control: { extend: () => ({}) },
    extend: () => ({}),
    divIcon: () => ({}),
    icon: () => ({}),
    control: {
      fullscreen: () => ({
        addTo: vi.fn(),
        remove: vi.fn(),
      }),
    },
  };
}
