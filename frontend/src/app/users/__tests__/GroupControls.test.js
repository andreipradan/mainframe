import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Groups from '../Groups';
import ExpenseGroups from '../../expenses/ExpenseGroups';

let mockState = null;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('src/api/expenses', () => ({
  GroupsApi: Object.assign(
    function GroupsApiMock() {
      return {
        getList: () => ({ type: 'groups/getList' }),
        delete: (id, name) => ({
          type: 'groups/delete',
          payload: { id, name },
        }),
      };
    },
    {
      removeUserFromGroup: (token, groupId, userId) => ({
        type: 'groups/removeUser',
        payload: { token, groupId, userId },
      }),
    }
  ),
}));
jest.mock('react-loader-spinner', () => ({ Circles: () => null }));
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Form = ({ children }) => React.createElement('form', null, children);
  Form.Group = ({ children }) => React.createElement('div', null, children);
  Form.Control = React.forwardRef((props, ref) =>
    React.createElement('input', { ...props, ref })
  );
  return { Form };
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', { role: 'dialog' }, children) : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = () => React.createElement('div');
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return {
    __esModule: true,
    default: Modal,
    Header: Modal.Header,
    Title: Modal.Title,
    Body: Modal.Body,
    Footer: Modal.Footer,
  };
});
jest.mock('../../shared/BottomPagination', () => () => null);
jest.mock('../../shared/Errors', () => () => null);
jest.mock(
  '../../expenses/EmailCollapse',
  () =>
    ({ emailOpen, groupId }) =>
      require('react').createElement(
        'output',
        { 'data-testid': `email-${groupId}` },
        emailOpen === groupId ? 'open' : 'closed'
      )
);

const groupRecord = {
  id: 3,
  name: 'Trip',
  created_by: 9,
  users: [
    { id: 7, username: 'ana', email: 'ana@example.test', is_active: true },
  ],
};

const renderGroups = (Component, isExpenseGroups = false) => {
  mockState = {
    auth: {
      token: 'token',
      user: isExpenseGroups ? { id: 9, is_staff: false } : undefined,
    },
    groups: {
      loading: false,
      errors: null,
      count: 1,
      results: [groupRecord],
      selectedItem: groupRecord,
    },
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Component />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe.each([
  ['user groups', Groups, false],
  ['expense groups', ExpenseGroups, true],
])('%s controls', (_name, Component, isExpenseGroups) => {
  beforeEach(() => mockDispatch.mockReset());

  test('email and member controls expose their action and confirmation', () => {
    const { container, unmount } = renderGroups(Component, isExpenseGroups);
    const manageEmails = container.querySelector(
      'button[aria-label="Manage emails for Trip"]'
    );
    const removeUser = container.querySelector(
      'button[aria-label="Remove ana from Trip"]'
    );

    expect(manageEmails).not.toBeNull();
    expect(removeUser).not.toBeNull();
    act(() => manageEmails.click());
    expect(container.querySelector('[data-testid="email-3"]').textContent).toBe(
      'open'
    );

    act(() => removeUser.click());
    expect(container.querySelector('[role="dialog"]').textContent).toContain(
      'Remove user ana from group Trip?'
    );
    expect(
      mockDispatch.mock.calls.some(([action]) => action?.payload === 3)
    ).toBe(true);
    unmount();
  });

  test('delete control opens a confirmation for the selected group', () => {
    const { container, unmount } = renderGroups(Component, isExpenseGroups);
    const deleteButton = container.querySelector(
      'button[aria-label="Delete group Trip"]'
    );

    if (!isExpenseGroups) expect(deleteButton).not.toBeNull();
    if (deleteButton) {
      act(() => deleteButton.click());
      expect(container.querySelector('[role="dialog"]').textContent).toContain(
        'Delete group Trip?'
      );
    }
    unmount();
  });

  test('member removal dispatches only after confirmation', () => {
    const { container, unmount } = renderGroups(Component, isExpenseGroups);
    act(() =>
      container
        .querySelector('button[aria-label="Remove ana from Trip"]')
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Yes, remove!')
        .click()
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'groups/removeUser',
      payload: { token: 'token', groupId: 3, userId: 7 },
    });
    unmount();
  });
});
