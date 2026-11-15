import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BottomPagination from './BottomPagination';

const mockDispatch = jest.fn();
let mockToken = 'token';

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector({ auth: { token: mockToken } }),
}));

jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Pagination = ({ children }) =>
    React.createElement('nav', null, children);
  const control =
    (label) =>
    ({ children, onClick, disabled, active }) =>
      React.createElement(
        'button',
        {
          type: 'button',
          'aria-label': label,
          'aria-current': active ? 'page' : undefined,
          disabled,
          onClick,
        },
        children || label
      );
  Pagination.First = control('First');
  Pagination.Prev = control('Previous');
  Pagination.Next = control('Next');
  Pagination.Last = control('Last');
  Pagination.Ellipsis = () => React.createElement('span', null, '…');
  Pagination.Item = control('Page');

  return { Pagination };
});

const renderPagination = (items, fetchMethod = jest.fn()) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const setKwargs = jest.fn((kwargs) => ({ type: 'setKwargs', kwargs }));

  act(() =>
    root.render(
      <BottomPagination
        items={items}
        fetchMethod={fetchMethod}
        setKwargs={setKwargs}
      />
    )
  );

  return { container, root, setKwargs, fetchMethod };
};

afterEach(() => {
  mockDispatch.mockClear();
  mockToken = 'token';
});

test('shows page controls and dispatches navigation using the previous page', () => {
  const { container, root, setKwargs, fetchMethod } = renderPagination({
    count: 100,
    page_size: 10,
    previous: 'https://example.com/items/?page=2',
    next: 'https://example.com/items/?page=4',
    kwargs: { search: 'item' },
  });
  mockDispatch.mockClear();

  expect(container.querySelector('[aria-current="page"]').textContent).toBe(
    '3'
  );
  expect(fetchMethod).toHaveBeenCalledWith('token', { search: 'item' });

  ['First', 'Previous', 'Next', 'Last'].forEach((label, index) => {
    act(() => container.querySelector(`[aria-label="${label}"]`).click());
    expect(mockDispatch).toHaveBeenNthCalledWith(index + 1, {
      type: 'setKwargs',
      kwargs: { page: [1, 2, 4, 10][index] },
    });
  });

  act(() => root.unmount());
  expect(setKwargs).toHaveBeenCalledTimes(4);
});

test('uses first page when there is no previous URL and handles the new API', () => {
  const fetchMethod = jest.fn((kwargs) => ({ type: 'fetch', kwargs }));
  const { container, root } = renderPagination(
    {
      count: 25,
      page_size: 10,
      previous: null,
      next: 'https://example.com/items/?page=2',
      kwargs: {},
    },
    fetchMethod
  );
  expect(container.querySelector('[aria-current="page"]').textContent).toBe(
    '1'
  );
  expect(container.querySelector('[aria-label="First"]').disabled).toBe(true);
  expect(container.querySelector('[aria-label="Previous"]').disabled).toBe(
    true
  );

  act(() => root.unmount());
});

test('does not render pagination when the result fits on one page', () => {
  const { container, root } = renderPagination({
    count: 5,
    page_size: 10,
    previous: null,
    next: null,
  });

  expect(container.querySelector('nav')).toBeNull();
  act(() => root.unmount());
});
