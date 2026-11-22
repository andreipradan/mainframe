import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import EditModal from './EditModal';
import DevicesApi from '../../api/devices';
import { selectItem, setModalOpen } from '../../redux/devicesSlice';

let mockState;
let mockApi;
const mockDispatch = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
vi.mock('../../api/devices', () => ({
  default: vi.fn(function DevicesApiMock() {
    return {
      create: vi.fn((...args) => ({ type: 'devices/create', args })),
      update: vi.fn((...args) => ({ type: 'devices/update', args })),
      delete: vi.fn((...args) => ({ type: 'devices/delete', args })),
    };
  }),
}));
vi.mock('../../redux/devicesSlice', () => ({
  selectItem: vi.fn((...args) => ({ type: 'devices/selectItem', args })),
  setModalOpen: vi.fn((...args) => ({ type: 'devices/setModalOpen', args })),
}));
vi.mock('react-ace', () => ({
  default: ({ className, onChange, value }) => (
    <textarea
      className={className}
      data-testid='additional-data'
      value={value || ''}
      onChange={(event) =>
        onChange(event.target.value, { end: { row: 0, column: 0 } })
      }
    />
  ),
}));
vi.mock('react-bootstrap/Modal', () => {
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', null, children) : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('h2', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});
vi.mock('react-tooltip', () => ({ Tooltip: () => null }));
vi.mock('react-loader-spinner', () => ({
  ColorRing: () => <div data-testid='loading'>Loading</div>,
}));
vi.mock('../shared/Errors', () => ({
  default: ({ errors }) => (
    <div data-testid='errors'>{JSON.stringify(errors)}</div>
  ),
}));

describe('Device EditModal', () => {
  let container;
  let root;

  beforeEach(() => {
    mockDispatch.mockClear();
    DevicesApi.mockClear();
    mockApi = null;
    DevicesApi.mockImplementation(function DevicesApiMock() {
      mockApi = {
        create: vi.fn((...args) => ({ type: 'devices/create', args })),
        update: vi.fn((...args) => ({ type: 'devices/update', args })),
        delete: vi.fn((...args) => ({ type: 'devices/delete', args })),
      };
      return mockApi;
    });
    mockState = {
      auth: { token: 'token' },
      devices: {
        errors: ['Error'],
        loadingItems: [],
        modalOpen: true,
        selectedItem: null,
      },
    };
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  test('creates a device with parsed additional data', () => {
    act(() => root.render(<EditModal />));
    const textInputs = container.querySelectorAll('input[type="text"]');
    ['Sensor', 'Hall', '192.0.2.1', '00:11:22:33:44:55'].forEach(
      (value, index) => {
        act(() => Simulate.change(textInputs[index], { target: { value } }));
      }
    );
    act(() => {
      Simulate.change(
        container.querySelector('[data-testid="additional-data"]'),
        {
          target: { value: '{\n  "room": "hall"\n}' },
        }
      );
    });

    act(() => container.querySelector('button.btn-primary').click());
    expect(mockApi.create).toHaveBeenCalledWith({
      alias: 'Hall',
      ip: '192.0.2.1',
      is_active: false,
      name: 'Sensor',
      should_notify_presence: false,
      mac: '00:11:22:33:44:55',
      additional_data: { room: 'hall' },
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'devices/create',
      args: [expect.objectContaining({ name: 'Sensor' })],
    });
  });

  test('edits, deletes, closes, and handles loading and invalid JSON', () => {
    const device = {
      id: 8,
      additional_data: { room: 'study' },
      alias: 'Study',
      display_name: 'Sensor in study',
      ip: '192.0.2.8',
      is_active: true,
      mac: '00:11:22:33:44:88',
      name: 'Sensor',
      should_notify_presence: false,
    };
    mockState.devices.selectedItem = device;
    mockState.devices.loadingItems = [8];
    act(() => root.render(<EditModal />));
    expect(container.querySelector('[data-testid="loading"]')).not.toBeNull();
    expect(container.textContent).toContain(
      'Telegram notifications turned off'
    );

    mockState.devices.loadingItems = [];
    act(() => root.render(<EditModal />));
    act(() =>
      Simulate.change(
        container.querySelector('[data-testid="additional-data"]'),
        {
          target: { value: '{invalid' },
        }
      )
    );
    expect(
      container
        .querySelector('[data-testid="additional-data"]')
        .className.includes('is-invalid')
    ).toBe(true);
    expect(
      container.querySelector('[data-testid="additional-data"]').value
    ).toBe('{invalid');
    act(() =>
      Simulate.change(
        container.querySelector('[data-testid="additional-data"]'),
        {
          target: { value: '{"room":"office"}' },
        }
      )
    );
    act(() => container.querySelector('button.btn-primary').click());
    expect(mockApi.update).toHaveBeenCalledWith(8, expect.any(Object));

    act(() => container.querySelector('button.btn-danger').click());
    expect(mockApi.delete).toHaveBeenCalledWith(8, 'Sensor in study');
    act(() => container.querySelector('button.btn-secondary').click());
    expect(selectItem).toHaveBeenCalled();
    expect(setModalOpen).toHaveBeenCalledWith(false);
    expect(mockDispatch).toHaveBeenCalledTimes(4);
  });
});
