import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Commands from '../Commands';
import Crons from '../Crons';
import Tasks from '../Tasks';
import Watchers from '../Watchers';
import WatchersApi from '../../../api/watchers';

jest.mock('../../../api/commands', () => ({
  __esModule: true,
  default: class CommandsApi {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'commands/getList', token: this.token };
    }

    run(name, data) {
      return { type: 'commands/run', name, data };
    }
  },
}));
jest.mock('../../../api/tasks', () => ({
  __esModule: true,
  default: {
    getList: (token) => ({ type: 'tasks/getList', token }),
    getItem: (token, name, id) => ({ type: 'tasks/getItem', token, name, id }),
    revoke: (token, name, app, method) => ({
      type: 'tasks/revoke',
      token,
      name,
      app,
      method,
    }),
    deleteHistory: (token, name) => ({
      type: 'tasks/deleteHistory',
      token,
      name,
    }),
  },
}));
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
  default: ({ value, placeholder, onChange, className }) =>
    require('react').createElement('textarea', {
      value: value ?? '',
      placeholder,
      className,
      onChange: (event) =>
        onChange(event.target.value, { end: { row: 0, column: 0 } }),
    }),
}));
jest.mock('react-loader-spinner', () => ({
  Audio: () => null,
  ColorRing: () => <div>Loading</div>,
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

const changeValue = (element, value) => {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      'value'
    ).set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

beforeEach(() => {
  mockDispatch.mockClear();
});

describe('command-related accessible controls', () => {
  test('shows loading and empty command states and fetches missing results', () => {
    mockState = {
      auth: { token: 'token' },
      commands: { results: null, errors: null, loading: true },
    };
    const loadingView = render(<Commands />);
    expect(loadingView.container.textContent).toContain('Loading');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'commands/getList',
      token: 'token',
    });
    loadingView.unmount();

    mockState = {
      auth: { token: 'token' },
      commands: { results: [], errors: null, loading: false },
    };
    const emptyView = render(<Commands />);
    expect(emptyView.container.textContent).toContain('No commands available');
    emptyView.unmount();
  });

  test('shows command argument metadata, validates kwargs, and dispatches a run', () => {
    mockState = {
      auth: { token: 'token' },
      commands: {
        results: [
          {
            app: 'finance',
            commands: [
              {
                name: 'reconcile',
                args: [
                  {
                    dest: 'name',
                    required: true,
                    type: 'str',
                    default: null,
                    choices: ['one', 'two'],
                    help: 'Account name',
                  },
                  {
                    dest: 'enabled',
                    required: true,
                    type: 'bool',
                    default: false,
                  },
                  { dest: 'count', required: true, type: 'int' },
                  { dest: 'rate', required: true, type: 'float' },
                  { dest: 'options', required: true, type: 'dict' },
                  { dest: 'items', required: true, type: 'list' },
                  {
                    dest: 'optional',
                    required: false,
                    type: 'str',
                    default: 'ignored',
                  },
                ],
              },
            ],
          },
        ],
        errors: null,
        loading: false,
      },
    };
    const { container, unmount } = render(<Commands />);
    const appButton = container.querySelector(
      'button[aria-controls="commands-0"]'
    );
    act(() => appButton.click());
    const commandButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent.includes('reconcile')
    );
    act(() => commandButton.click());

    expect(container.textContent).toContain('choices: one, two');
    expect(container.textContent).toContain('description: Account name');

    const argsInput = container.querySelector(
      'input[placeholder="Command arguments"]'
    );
    const kwargsInput = container.querySelector(
      'textarea[placeholder="Kwargs"]'
    );
    expect(kwargsInput.value).toContain('"enabled": false');
    expect(kwargsInput.value).not.toContain('"optional"');
    changeValue(argsInput, 'first second');
    changeValue(kwargsInput, '{invalid');
    expect(container.querySelector('.is-invalid')).not.toBeNull();

    changeValue(kwargsInput, '{"valid": true}');
    const runButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Run'
    );
    act(() => runButton.click());

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'commands/run',
      name: 'reconcile',
      data: { args: ['first', 'second'], kwargs: { valid: true } },
    });
    unmount();
  });

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

  test('refreshes commands, closes app groups, and runs an argument-free command', () => {
    mockState = {
      auth: { token: 'token' },
      commands: {
        results: [
          { app: 'finance', commands: [{ name: 'reconcile' }] },
          { app: 'empty', commands: [] },
        ],
        errors: null,
        loading: false,
      },
    };
    const { container, unmount } = render(<Commands />);
    const refresh = container.querySelector('.mdi-refresh').parentElement;
    act(() => refresh.click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'commands/getList',
      token: 'token',
    });

    const finance = container.querySelector(
      'button[aria-controls="commands-0"]'
    );
    act(() => finance.click());
    act(() => finance.click());
    expect(finance.getAttribute('aria-expanded')).toBe('false');

    const empty = container.querySelector('button[aria-controls="commands-1"]');
    act(() => empty.click());
    expect(container.querySelector('#commands-1').children).toHaveLength(0);

    act(() => finance.click());
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('reconcile'))
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Run')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'commands/run',
      name: 'reconcile',
      data: {},
    });
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

  test('loads tasks, renders empty and loading rows, and handles task actions', () => {
    mockState = {
      auth: { token: 'token' },
      tasks: {
        errors: null,
        loading: true,
        loadingItems: [],
        results: null,
        selectedItem: null,
      },
    };
    const loadingView = render(<Tasks />);
    expect(loadingView.container.textContent).toContain('Loading');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'tasks/getList',
      token: 'token',
    });
    loadingView.unmount();

    mockState = {
      auth: { token: 'token' },
      tasks: {
        errors: null,
        loading: false,
        loadingItems: [],
        results: [],
        selectedItem: null,
      },
    };
    const emptyView = render(<Tasks />);
    expect(emptyView.container.textContent).toContain('No tasks available');
    emptyView.unmount();

    const task = {
      id: 12,
      app: 'finance',
      name: 'reconcile',
      timestamp: '2025-01-02T12:00:00Z',
      status: 'unknown',
      detail: 'Details',
      is_periodic: true,
      is_revoked: true,
      history: [],
      errors: [],
    };
    mockState = {
      auth: { token: 'token' },
      tasks: {
        errors: null,
        loading: false,
        loadingItems: [task.id],
        results: [task],
        selectedItem: task,
      },
    };
    const loadingDetails = render(<Tasks />);
    expect(loadingDetails.container.textContent).toContain('Loading');
    loadingDetails.unmount();

    mockState.tasks.loadingItems = [];
    const selectedView = render(<Tasks />);
    const { container, unmount } = selectedView;
    expect(container.textContent).not.toContain('Loading');
    expect(container.textContent).toContain('Unknown');
    expect(container.textContent).toContain('Detail: Details');
    expect(container.querySelectorAll('.mdi-check')).toHaveLength(4);

    act(() => container.querySelector('tbody button').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'tasks/selectItem',
      payload: 12,
    });
    act(() =>
      container.querySelectorAll('.mdi-refresh')[1].parentElement.click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'tasks/getItem',
      token: 'token',
      name: 'reconcile',
      id: 12,
    });
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Restore')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'tasks/revoke',
      token: 'token',
      name: 'reconcile',
      app: 'finance',
      method: 'restore',
    });
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Delete history')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'tasks/deleteHistory',
      token: 'token',
      name: 'reconcile',
    });
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Close')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'tasks/selectItem',
      payload: null,
    });
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
