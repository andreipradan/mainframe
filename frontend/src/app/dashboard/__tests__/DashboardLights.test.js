import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from '../Dashboard';

let mockState;
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector(mockState),
}));
jest.mock('src/api/bots', () => ({
  __esModule: true,
  default: class {
    getList = () => ({ type: 'bots/getList' });
  },
}));
jest.mock('src/api/devices', () => ({
  __esModule: true,
  default: class {
    getList = () => ({ type: 'devices/getList' });
  },
}));
jest.mock('src/api/activity', () => ({
  __esModule: true,
  default: class {
    getList = () => ({ type: 'activity/getList' });
  },
}));
jest.mock('src/api/lights', () => ({
  __esModule: true,
  default: class {
    getList = () => ({ type: 'lights/getList' });
    static turn_on = jest.fn();
    static turn_off = jest.fn();
    static turn_all = jest.fn();
  },
}));
jest.mock('src/api/rpi', () => ({
  __esModule: true,
  default: class {
    static logout = jest.fn();
  },
}));
jest.mock('../chartsData', () => ({
  doughnutPieOptions: {},
  getLightsData: () => ({ labels: [], datasets: [] }),
  sliderSettings: {},
}));
jest.mock('chart.js', () => ({
  ArcElement: {},
  CategoryScale: {},
  Chart: { register: jest.fn() },
}));
jest.mock('react-chartjs-2', () => ({ Doughnut: () => null }));
jest.mock('nouislider-react', () => () => null);
jest.mock('react-slick', () => () => null);
jest.mock('react-color', () => ({ SliderPicker: () => null }));
jest.mock('react-loader-spinner', () => ({
  ColorRing: () => null,
  InfinitySpin: () => null,
  LineWave: () => null,
}));
jest.mock('react-bootstrap', () => {
  const React = require('react');
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
jest.mock('react-bootstrap/Button', () => () => null);
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', null, children) : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});
jest.mock('../../shared/Errors', () => () => null);

describe('Dashboard light disclosures', () => {
  test('expands a light using its accessible disclosure button', async () => {
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
    await act(async () => root.render(<Dashboard />));

    const lightButton = container.querySelector(
      'button[aria-controls="slider-0"]'
    );
    expect(lightButton).not.toBeNull();
    expect(lightButton.getAttribute('aria-expanded')).toBe('false');
    await act(async () => lightButton.click());
    expect(lightButton.getAttribute('aria-expanded')).toBe('true');

    act(() => root.unmount());
  });
});
