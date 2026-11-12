import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Earthquakes, { formatDate, formatTime } from './Earthquakes';

let mockState;
let mockBarProps;
const mockDispatch = jest.fn();
const mockPolygonOn = jest.fn();
const mockHomeOn = jest.fn();
const mockBulletPush = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/earthquakes', () => ({
  __esModule: true,
  default: class EarthquakesApiMock {
    constructor(token) {
      this.token = token;
    }

    getList(kwargs) {
      return { type: 'earthquakes/getList', payload: kwargs };
    }
  },
}));
jest.mock('../../api/bots', () => ({
  __esModule: true,
  default: class BotsApiMock {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'bots/getList' };
    }
  },
}));
jest.mock('../../redux/earthquakesSlice', () => ({
  setKwargs: (kwargs) => ({ type: 'earthquakes/setKwargs', payload: kwargs }),
}));
jest.mock('../shared/BottomPagination', () => () => null);
jest.mock('react-loader-spinner', () => ({
  BallTriangle: () => <div>Loading earthquake chart</div>,
  Circles: () => <div>Loading earthquake update</div>,
}));
jest.mock('react-bootstrap/Alert', () => {
  const React = require('react');
  return ({ children, onClose }) =>
    React.createElement(
      'div',
      null,
      children,
      React.createElement('button', { onClick: onClose }, 'Dismiss')
    );
});
jest.mock('react-chartjs-2', () => ({
  Bar: (props) => {
    mockBarProps = props;
    return <div>Earthquake chart</div>;
  },
}));
jest.mock('chart.js', () => ({
  BarElement: {},
  CategoryScale: {},
  Chart: { register: jest.fn() },
  LinearScale: {},
  Tooltip: {},
}));

const mockCreateSeries = () => ({
  mapPolygons: {
    template: {
      setAll: jest.fn(),
      states: { create: jest.fn() },
      events: { on: mockPolygonOn },
    },
  },
  setAll: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  chart: { zoomToGeoPoint: jest.fn() },
  data: { push: jest.fn() },
  bullets: { push: mockBulletPush },
  zoomToDataItem: () => ({ waitForStop: jest.fn() }),
});
jest.mock('@amcharts/amcharts5', () => ({
  percent: () => 100,
  color: (value) => value,
  Root: {
    new: () => ({
      container: { children: { push: (child) => child } },
      setThemes: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  Graphics: { new: () => ({}) },
  Button: {
    new: () => ({ events: { on: mockHomeOn }, show: jest.fn() }),
  },
  net: { load: () => Promise.resolve({ response: '{}' }) },
  ColorSet: { new: () => ({ next: () => 'blue' }) },
  Container: { new: () => ({ children: { push: jest.fn() } }) },
  Circle: { new: () => ({}) },
  Line: { new: () => ({}) },
  Label: { new: () => ({}) },
  LinearGradient: { new: () => ({}) },
  Bullet: { new: () => ({}) },
  p50: 50,
}));
jest.mock('@amcharts/amcharts5/map', () => ({
  geoNaturalEarth1: jest.fn(),
  MapChart: {
    new: () => ({
      series: { push: () => mockCreateSeries() },
      children: { push: (child) => child },
      set: jest.fn(),
      goHome: jest.fn(),
    }),
  },
  MapPolygonSeries: { new: () => mockCreateSeries() },
  MapPointSeries: { new: () => ({}) },
  ZoomControl: {
    new: () => ({
      minusButton: { set: jest.fn() },
      plusButton: { set: jest.fn() },
    }),
  },
}));
jest.mock('@amcharts/amcharts5/themes/Animated', () => ({
  __esModule: true,
  default: { new: () => ({}) },
}));
jest.mock('@amcharts/amcharts5-geodata/romaniaHigh', () => ({}));

const quake = {
  timestamp: '2025-01-02T03:04:00Z',
  magnitude: 4.2,
  location: 'Cluj',
  depth: '12.3',
  latitude: 46.77,
  longitude: 23.58,
  source: 'Test source',
  additional_data: {},
};

const renderEarthquakes = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Earthquakes />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('Earthquakes', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockPolygonOn.mockClear();
    mockHomeOn.mockClear();
    mockBulletPush.mockClear();
    mockBarProps = null;
    mockState = {
      auth: { token: 'token' },
      earthquakes: {
        count: 1,
        errors: null,
        loading: false,
        kwargs: {
          local_events: false,
          magnitude_gt5: false,
          largest_events: false,
        },
        last_check: { api: null },
        results: [
          quake,
          {
            ...quake,
            timestamp: '2025-01-03T03:04:00Z',
            magnitude: 5.2,
            location: 'World event',
            additional_data: {
              sols: { primary: { region: { type: 'world' } } },
            },
          },
          { ...quake, magnitude: 2.2, location: 'Small event' },
          { ...quake, magnitude: 3.5, location: 'Medium event' },
          { ...quake, magnitude: 6.2, location: 'Large event' },
        ],
      },
    };
  });

  test('renders earthquake data and applies all event filters', () => {
    const { container, unmount } = renderEarthquakes();
    expect(container.textContent).toContain('Earthquakes');
    expect(container.textContent).toContain('Cluj');
    expect(container.textContent).toContain('Test source');
    expect(container.textContent).toContain('4.2');
    expect(container.textContent).toContain('Earthquake chart');

    const gradient = { addColorStop: jest.fn() };
    const context = {
      dataIndex: 1,
      chart: { ctx: { createLinearGradient: () => gradient } },
      height: 100,
    };
    expect(mockBarProps.data.datasets[0].backgroundColor(context)).toBe(
      gradient
    );
    expect(mockBarProps.data.datasets[0].borderColor(context)).toBe(gradient);
    expect(
      mockBarProps.data.datasets[0].backgroundColor({
        ...context,
        dataIndex: 3,
      })
    ).toBe('rgba(114,167,203,0.25)');
    expect(
      mockBarProps.data.datasets[0].borderColor({
        ...context,
        dataIndex: 3,
      })
    ).toBe('gray');
    expect(
      mockBarProps.options.tooltips.callbacks.title([{ index: 4, label: 'x' }])
    ).toContain('Cluj');
    act(() => mockBarProps.onElementsClick([{ _index: 1 }]));
    act(() =>
      container.querySelectorAll('tbody tr').forEach((row) => row.click())
    );
    const bullet = mockBulletPush.mock.calls[0][0];
    [2, 3.5, 4.2, 5.2].forEach((value) =>
      bullet(null, null, { dataContext: { value } })
    );
    act(() => mockHomeOn.mock.calls[0][1]());
    act(() => {
      container
        .querySelectorAll('input[type="checkbox"]')
        .forEach((input) => input.click());
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'earthquakes/setKwargs' })
    );
    act(() => container.querySelector('h4.card-title button').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bots/getList',
    });
    unmount();
  });

  test('renders loading, errors, empty timestamps, and special event styling', () => {
    mockState.earthquakes.loading = true;
    mockState.earthquakes.errors = { detail: 'Request failed' };
    mockState.earthquakes.results = [
      {
        ...quake,
        magnitude: 5.5,
        intensity: 'V',
        additional_data: {
          sols: {
            primary: {
              receiveTime: quake.timestamp,
              region: { type: 'world' },
            },
          },
        },
      },
    ];
    const { container, unmount } = renderEarthquakes();
    expect(container.textContent).toContain('Loading earthquake chart');
    expect(container.textContent).toContain('Request failed');
    expect(container.textContent).toContain('Loading earthquake update');
    expect(mockBarProps).toBeNull();
    unmount();

    mockState.earthquakes.loading = false;
    mockState.earthquakes.errors = null;
    mockState.earthquakes.count = 0;
    mockState.earthquakes.last_check = { api: null };
    mockState.earthquakes.results = [];
    const empty = renderEarthquakes();
    expect(empty.container.textContent).toContain('Total: -');
    empty.unmount();
  });

  test('formats earthquake timestamps', () => {
    expect(formatDate(quake.timestamp)).toMatch(/25/);
    expect(formatTime(quake.timestamp)).toMatch(/25/);
  });
});
