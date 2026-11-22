import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import Dashboard from '../Dashboard';

let mockState = null;
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
vi.mock('src/api/bots', () => ({
  __esModule: true,
  default: class {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'bots/getList', token: this.token };
    }
  },
}));
vi.mock('src/api/devices', () => ({
  __esModule: true,
  default: class {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'devices/getList', token: this.token };
    }
  },
}));
vi.mock('src/api/activity', () => ({
  __esModule: true,
  default: class {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'activity/getList', token: this.token };
    }
  },
}));
vi.mock('src/api/lights', () => ({
  __esModule: true,
  default: class {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'lights/getList', token: this.token };
    }

    static turn_on = (...args) => ({ type: 'lights/turnOn', args });
    static turn_off = (...args) => ({ type: 'lights/turnOff', args });
    static turn_all = (...args) => ({ type: 'lights/turnAll', args });
    static setName = (...args) => ({ type: 'lights/setName', args });
    static setBrightness = (...args) => ({
      type: 'lights/setBrightness',
      args,
    });
    static setRgb = (...args) => ({ type: 'lights/setRgb', args });
    static setColorTemp = (...args) => ({ type: 'lights/setColorTemp', args });
  },
}));
vi.mock('src/api/rpi', () => ({
  __esModule: true,
  default: class {
    static logout = (...args) => ({ type: 'rpi/logout', args });
  },
}));
vi.mock('../chartsData', () => ({
  doughnutPieOptions: {},
  getLightsData: () => ({ labels: [], datasets: [] }),
  sliderSettings: {},
}));
vi.mock('chart.js', () => ({
  ArcElement: {},
  CategoryScale: {},
  Chart: { register: vi.fn() },
}));
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null }));
vi.mock('nouislider-react', () => ({
  default: ({ onChange, onSet, onSlide }) => (
    <div>
      <span className='noUi-tooltip' />
      <button
        type='button'
        onClick={() => onChange?.('', 0, [2700], null, [54])}
      >
        Change slider
      </button>
      <button type='button' onClick={() => onSet?.()}>
        Set slider
      </button>
      <button type='button' onClick={() => onSlide?.()}>
        Slide slider
      </button>
    </div>
  ),
}));
vi.mock('react-slick', () => ({ default: () => null }));
vi.mock('react-color', () => ({
  SliderPicker: ({ onChange, onChangeComplete }) => (
    <div>
      <button type='button' onClick={() => onChange?.({ hex: '#abcdef' })}>
        Preview color
      </button>
      <button
        type='button'
        onClick={() => onChangeComplete?.({ rgb: { r: 0, g: 100, b: 200 } })}
      >
        Apply color
      </button>
    </div>
  ),
}));
vi.mock('react-loader-spinner', () => ({
  ColorRing: () => null,
  InfinitySpin: () => null,
  LineWave: () => null,
}));
vi.mock('react-bootstrap', () => {
  const Form = ({ children }) => React.createElement('div', null, children);
  Form.Group = ({ children }) => React.createElement('div', null, children);
  Form.Label = ({ children }) => React.createElement('label', null, children);
  Form.Control = (props) => React.createElement('input', props);
  Form.Check = ({ checked, ...props }) =>
    React.createElement('input', { type: 'checkbox', checked, ...props });
  return {
    Collapse: ({ children }) => React.createElement('div', null, children),
    Form,
  };
});
vi.mock('react-bootstrap/Button', () => {
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
vi.mock('react-bootstrap/Modal', () => {
  const Modal = ({ children, onHide, show }) =>
    show
      ? React.createElement(
          'div',
          null,
          children,
          React.createElement(
            'button',
            { type: 'button', 'aria-label': 'Hide modal', onClick: onHide },
            'Hide modal'
          )
        )
      : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});
vi.mock('../../shared/Errors', () => ({ default: () => null }));

describe('Dashboard light disclosures', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('expands a light using its accessible disclosure button', () => {
    mockState = {
      auth: { token: 'auth-token' },
      rpi: { token: 'rpi-token' },
      activity: { results: [], loading: false, count: 0 },
      bots: { results: [], loading: false, count: 0 },
      devices: { results: [], loading: false, count: 0 },
      lights: {
        results: [
          {
            ip: '10.0.0.4',
            capabilities: { name: 'Desk lamp', power: 'off', bright: 25 },
          },
        ],
        loading: false,
        loadingItems: [],
        errors: null,
        count: 1,
      },
    };
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<Dashboard />));

    const lightButton = container.querySelector(
      'button[aria-controls="slider-0"]'
    );
    expect(lightButton).not.toBeNull();
    expect(lightButton.getAttribute('aria-expanded')).toBe('false');
    act(() => lightButton.click());
    expect(lightButton.getAttribute('aria-expanded')).toBe('true');

    act(() => root.unmount());
  });

  test('controls lights, edits names, refreshes data, and polls activity', () => {
    vi.useFakeTimers();
    mockState = {
      auth: { token: 'auth-token' },
      rpi: { token: 'rpi-token' },
      activity: {
        results: [{ id: 1, title: 'Light was switched on' }],
        loading: false,
        count: 1,
      },
      bots: { results: [], loading: false, count: 0 },
      devices: {
        results: [{ id: 1, is_active: true }],
        loading: false,
        count: 1,
      },
      lights: {
        results: [
          {
            ip: '10.0.0.4',
            capabilities: {
              name: 'Desk lamp',
              power: 'off',
              bright: 25,
              ct: 3000,
            },
          },
        ],
        loading: false,
        loadingItems: [],
        errors: null,
        count: 1,
      },
    };
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<Dashboard />));

    expect(container.textContent).toContain('Light was switched on');
    expect(container.textContent).not.toContain('No activity');
    container.querySelectorAll('.mdi-refresh').forEach((icon) => {
      act(() => icon.closest('button').click());
    });
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Log out RPi')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'rpi/logout',
      args: ['rpi-token'],
    });

    act(() =>
      Simulate.change(container.querySelector('#checkbox-toggle'), {
        target: { checked: true },
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'lights/turnAll',
      args: ['rpi-token', 'on'],
    });

    const lightButton = container.querySelector(
      'button[aria-controls="slider-0"]'
    );
    act(() => lightButton.click());
    expect(lightButton.getAttribute('aria-expanded')).toBe('true');
    act(() =>
      Simulate.change(container.querySelector('#checkbox-0'), {
        target: { checked: true },
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'lights/turnOn',
      args: ['rpi-token', '10.0.0.4'],
    });

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Change name?')
        .click()
    );
    expect(container.textContent).toContain('Edit Desk lamp?');
    const nameInput = container.querySelector('input[type="text"]');
    act(() =>
      Simulate.change(nameInput, { target: { value: 'Reading lamp' } })
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Update name')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'lights/setName',
      args: ['rpi-token', '10.0.0.4', 'Reading lamp'],
    });

    for (const label of [
      'Change slider',
      'Set slider',
      'Slide slider',
      'Preview color',
      'Apply color',
    ]) {
      act(() =>
        Array.from(container.querySelectorAll('button'))
          .find((button) => button.textContent === label)
          .click()
      );
    }
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .filter((button) => button.textContent === 'Change slider')[1]
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'lights/setBrightness',
      args: ['rpi-token', '10.0.0.4', 54],
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'lights/setRgb',
      args: ['rpi-token', '10.0.0.4', [1, 100, 200]],
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'lights/setColorTemp',
      args: ['rpi-token', '10.0.0.4', 2700],
    });

    act(() => container.querySelector('.mdi-toggle-switch-off').click());
    act(() => vi.advanceTimersByTime(5000));
    expect(
      mockDispatch.mock.calls.some(
        ([action]) => action?.type === 'activity/getList'
      )
    ).toBe(true);

    act(() => container.querySelector('[aria-label="Hide modal"]').click());
    act(() => root.unmount());
  });
});
