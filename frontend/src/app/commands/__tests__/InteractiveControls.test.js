import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Commands from '../Commands';
import Crons from '../Crons';
import Tasks from '../Tasks';
import Watchers from '../Watchers';
import WatchersApi from '../../../api/watchers';

let mockState = null;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-bootstrap', () => ({
  Collapse: ({ children }) => children,
}));
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
jest.mock('react-bootstrap/Form', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children, ...props }) =>
    React.createElement('label', props, children);
  Form.Control = React.forwardRef((props, ref) =>
    React.createElement('input', { ...props, value: props.value ?? '', ref })
  );
  Form.Check = (props) => React.createElement('input', props);
  return { __esModule: true, default: Form };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children }) => React.createElement('div', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  return {
    __esModule: true,
    default: Modal,
    Body: Modal.Body,
    Footer: Modal.Footer,
    Header: Modal.Header,
    Title: Modal.Title,
  };
});
jest.mock('react-ace', () => ({
  __esModule: true,
  default: ({ value, placeholder }) =>
    require('react').createElement('textarea', {
      value: value ?? '',
      placeholder,
    }),
}));
jest.mock('react-loader-spinner', () => ({
  Audio: () => null,
  ColorRing: () => null,
}));
jest.mock('react-select', () => ({
  __esModule: true,
  default: ({ value }) =>
    require('react').createElement('div', null, value?.label),
}));
jest.mock('../../shared/Errors', () => () => null);
jest.mock('../../shared/BottomPagination', () => () => null);

const render = (component) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(component));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

beforeEach(() => {
  mockDispatch.mockClear();
});

describe('command-related accessible controls', () => {
  test('expands an app and opens the selected command', () => {
    mockState = {
      auth: { token: 'token' },
      commands: {
        results: [
          { app: 'finance', commands: [{ name: 'reconcile', args: [] }] },
        ],
        errors: null,
        loading: false,
      },
    };
    const { container, unmount } = render(<Commands />);
    const appButton = container.querySelector(
      'button[aria-controls="commands-0"]'
    );

    expect(appButton.getAttribute('aria-expanded')).toBe('false');
    act(() => appButton.click());
    expect(appButton.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#commands-0')).not.toBeNull();

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('reconcile'))
        .click();
    });
    expect(container.textContent).toContain('Run reconcile?');
    unmount();
  });

  test('duplicates a cron into the add form with its name and expression', () => {
    const cron = {
      id: 11,
      name: 'Morning sync',
      command: 'sync_data',
      expression: '0 8 * * *',
      is_active: true,
      kwargs: { dry_run: false },
      redis: {},
      cron_description: 'At 08:00',
    };
    mockState = {
      auth: { token: 'token' },
      rpi: { token: null },
      crons: {
        results: [cron],
        count: 1,
        loading: false,
        loadingItems: [],
        selectedItem: null,
        modalOpen: false,
        errors: null,
        kwargs: {},
      },
      commands: {
        results: [{ app: 'jobs', commands: [{ name: 'sync_data', args: [] }] }],
        errors: null,
        loading: false,
      },
    };
    const { container, unmount } = render(<Crons />);
    const duplicateButton = container.querySelector(
      'button[aria-label="Duplicate cron Morning sync"]'
    );
    expect(duplicateButton).not.toBeNull();

    act(() => duplicateButton.click());

    const fields = Array.from(container.querySelectorAll('input[type="text"]'));
    expect(fields[0].value).toBe('Morning sync');
    expect(fields[1].value).toBe('0 8 * * *');
    expect(
      mockDispatch.mock.calls.some(([action]) => action?.payload === true)
    ).toBe(true);
    unmount();
  });

  test('expands selected task history and keeps its disclosure state in sync', () => {
    const history = [{ timestamp: '2025-01-02T12:00:00Z', status: 'complete' }];
    mockState = {
      auth: { token: 'token' },
      tasks: {
        errors: null,
        loading: false,
        loadingItems: [],
        results: [],
        selectedItem: {
          id: 7,
          app: 'finance',
          name: 'reconcile',
          history,
          errors: [
            { timestamp: '2025-01-03T12:00:00Z', message: 'Task failed' },
          ],
          is_periodic: false,
          is_revoked: false,
        },
      },
    };
    const { container, unmount } = render(<Tasks />);
    const historyButton = container.querySelector(
      'button[aria-controls="task-7-history"]'
    );

    expect(historyButton).not.toBeNull();
    expect(historyButton.getAttribute('aria-expanded')).toBe('false');
    act(() => historyButton.click());
    expect(historyButton.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#task-7-history').textContent).toContain(
      'Status: Complete'
    );
    const errorsButton = container.querySelector(
      'button[aria-controls="task-7-errors"]'
    );
    expect(errorsButton.getAttribute('aria-expanded')).toBe('false');
    act(() => errorsButton.click());
    expect(errorsButton.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#task-7-errors').textContent).toContain(
      'Message: Task failed'
    );
    unmount();
  });

  test('renders task status and tasks that have not run', () => {
    mockState = {
      auth: { token: 'token' },
      tasks: {
        errors: null,
        loading: false,
        loadingItems: [],
        results: [
          {
            id: 8,
            app: 'finance',
            name: 'reconcile',
            history: [
              {
                timestamp: '2025-01-02T12:00:00Z',
                status: 'executing',
              },
            ],
            errors: [],
            is_periodic: false,
            is_revoked: false,
          },
          {
            id: 9,
            app: 'finance',
            name: 'archive',
            history: [],
            errors: [],
            is_periodic: false,
            is_revoked: false,
          },
        ],
        selectedItem: null,
      },
    };
    const { container, unmount } = render(<Tasks />);
    const rows = container.querySelectorAll('tbody tr');

    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.text-warning').textContent).toBe(
      'Executing'
    );
    expect(rows[1].textContent).toContain("Didn't run");
    unmount();
  });

  test('duplicates a watcher and runs the selected record', () => {
    const watcher = {
      id: 21,
      name: 'Daily prices',
      cron: '0 9 * * *',
      cron_notification: '0 9 * * *',
      cron_description: 'At 09:00',
      cron_notification_description: 'At 09:00',
      is_active: true,
      latest: {},
      request: {},
      selector: '.price',
      type: 'html',
      url: 'https://example.test/prices',
      link_base_url: '',
      redis: { history: [], errors: [] },
    };
    mockState = {
      auth: { token: 'token' },
      rpi: { token: 'ngrok-token' },
      watchers: {
        results: [watcher],
        errors: null,
        loading: false,
        loadingItems: [],
        modalOpen: false,
        selectedItem: null,
        types: [['html', 'HTML']],
      },
    };
    const runSpy = jest.spyOn(WatchersApi, 'run');
    const { container, unmount } = render(<Watchers />);

    act(() =>
      container
        .querySelector('button[aria-label="Duplicate watcher Daily prices"]')
        .click()
    );
    expect(
      Array.from(container.querySelectorAll('input')).some(
        (input) => input.value === 'Daily prices'
      )
    ).toBe(true);

    act(() =>
      container
        .querySelector('button[aria-label="Run watcher Daily prices"]')
        .click()
    );
    expect(runSpy).toHaveBeenCalledWith('ngrok-token', 21);
    runSpy.mockRestore();
    unmount();
  });

  test('opens watcher history and error disclosures for the selected watcher', () => {
    const watcher = {
      id: 21,
      name: 'Daily prices',
      cron: '0 9 * * *',
      cron_notification: '0 9 * * *',
      cron_description: 'At 09:00',
      cron_notification_description: 'At 09:00',
      is_active: true,
      latest: {},
      request: {},
      selector: '.price',
      type: 'html',
      url: 'https://example.test/prices',
      link_base_url: '',
      redis: {
        history: [{ timestamp: '2025-01-02T12:00:00Z', status: 'complete' }],
        errors: [
          { timestamp: '2025-01-03T12:00:00Z', message: 'Fetch failed' },
        ],
      },
    };
    mockState = {
      auth: { token: 'token' },
      rpi: { token: 'ngrok-token' },
      watchers: {
        results: [watcher],
        errors: null,
        loading: false,
        loadingItems: [],
        modalOpen: false,
        selectedItem: watcher,
        types: [['html', 'HTML']],
      },
    };
    const { container, unmount } = render(<Watchers />);

    const historyButton = container.querySelector(
      'button[aria-controls="watcher-21-history"]'
    );
    const errorsButton = container.querySelector(
      'button[aria-controls="watcher-21-errors"]'
    );
    act(() => historyButton.click());
    act(() => errorsButton.click());

    expect(historyButton.getAttribute('aria-expanded')).toBe('true');
    expect(errorsButton.getAttribute('aria-expanded')).toBe('true');
    expect(
      container.querySelector('#watcher-21-history').textContent
    ).toContain('Status: Complete');
    expect(container.querySelector('#watcher-21-errors').textContent).toContain(
      'Message: Fetch failed'
    );
    unmount();
  });
});
