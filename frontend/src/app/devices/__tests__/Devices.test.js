import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Devices from '../Devices';

jest.mock('../../../api/devices', () => {
  class DevicesApi {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'devices/getList', token: this.token };
    }
  }
  DevicesApi.sync = jest.fn(() => ({ type: 'devices/sync' }));
  return { __esModule: true, default: DevicesApi };
});
jest.mock('../EditModal', () => () => null);
jest.mock('../../shared/Errors', () => () => null);
jest.mock('react-loader-spinner', () => ({
  Audio: () => null,
  Circles: () => null,
}));
jest.mock('react-bootstrap', () => ({
  Collapse: ({ children }) => <div>{children}</div>,
}));

const devices = [
  {
    id: 1,
    display_name: 'Router',
    is_active: true,
    ip: '10.0.0.2',
    mac: 'aa:00',
    last_seen: '2025-01-02T00:00:00Z',
    should_notify_presence: true,
  },
  {
    id: 2,
    display_name: 'Sensor',
    is_active: false,
    ip: '10.0.0.1',
    mac: 'bb:00',
    last_seen: '2025-01-01T00:00:00Z',
    should_notify_presence: true,
  },
];

const renderDevices = () => {
  const initialState = {
    auth: { token: 'token' },
    devices: {
      results: devices,
      errors: null,
      loading: false,
      loadingItems: [],
      count: devices.length,
      modalOpen: false,
    },
  };
  const store = configureStore({ reducer: (state = initialState) => state });
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(
      <Provider store={store}>
        <Devices />
      </Provider>
    );
  });
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const visibleIps = (container) =>
  Array.from(container.querySelectorAll('tbody tr'))
    .filter((row) => row.querySelectorAll('td').length > 1)
    .map((row) => row.querySelectorAll('td')[3].textContent);

describe('Devices sorting', () => {
  test('cycles a column through ascending, descending, and original order', () => {
    const { container, unmount } = renderDevices();
    const sortButton = container.querySelector(
      'button[aria-label="Sort by ip"]'
    );

    expect(sortButton).not.toBeNull();
    expect(visibleIps(container)).toEqual(['10.0.0.2', '10.0.0.1']);

    act(() => sortButton.click());
    expect(visibleIps(container)).toEqual(['10.0.0.1', '10.0.0.2']);

    act(() => sortButton.click());
    expect(visibleIps(container)).toEqual(['10.0.0.2', '10.0.0.1']);

    act(() => sortButton.click());
    expect(visibleIps(container)).toEqual(['10.0.0.2', '10.0.0.1']);
    unmount();
  });
});
