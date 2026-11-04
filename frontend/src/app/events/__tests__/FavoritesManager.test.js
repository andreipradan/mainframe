import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import FavoritesManager from '../FavoritesManager';

let mockState = null;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../../api/favorites', () => ({
  __esModule: true,
  default: function FavoritesApiMock() {
    return {
      create(data) {
        return { type: 'favorites/create', payload: data };
      },
      getList(kwargs) {
        return { type: 'favorites/getList', payload: kwargs };
      },
      update(id, data) {
        return { type: 'favorites/update', payload: { id, data } };
      },
    };
  },
}));
jest.mock('../../shared/Errors', () => () => null);
jest.mock('react-loader-spinner', () => ({ Audio: () => null }));
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Control = (props) => React.createElement('input', props);
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

const CurrentPath = () => {
  const location = useLocation();
  return <output data-testid='current-path'>{location.pathname}</output>;
};

const renderFavorites = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/favorites']}>
        <CurrentPath />
        <FavoritesManager />
      </MemoryRouter>
    );
  });
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('FavoritesManager interactions', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockState = {
      auth: { token: 'token' },
      favorites: {
        results: [{ id: 8, name: 'Radiohead', external_id: 'radiohead' }],
        kwargs: {},
        loading: false,
      },
    };
  });

  test('selecting a favorite filters events and navigates to them', () => {
    const { container, unmount } = renderFavorites();
    const favoriteButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) => button.textContent === 'Radiohead');

    expect(favoriteButton.type).toBe('button');
    act(() => favoriteButton.click());

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'events/setKwargs',
      payload: { favorites: ['Radiohead'], page: 1 },
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'favorites/setFavoritesFilter',
      payload: true,
    });
    expect(
      container.querySelector('[data-testid="current-path"]').textContent
    ).toBe('/events');
    unmount();
  });

  test('editing saves a trimmed name and preserves the external id', () => {
    const { container, unmount } = renderFavorites();
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Edit')
        .click()
    );

    const nameInput = container.querySelector('tbody input');
    const setInputValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    act(() => {
      setInputValue.call(nameInput, '  Radiohead live  ');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Save')
        .click()
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'favorites/update',
      payload: {
        id: 8,
        data: { name: 'Radiohead live', external_id: 'radiohead' },
      },
    });
    expect(container.querySelector('tbody input')).toBeNull();
    unmount();
  });

  test('adds a favorite from trimmed form values', async () => {
    const { container, unmount } = renderFavorites();
    const [nameInput, urlInput] = container.querySelectorAll('form input');
    const setInputValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    act(() => {
      setInputValue.call(nameInput, '  New band  ');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      setInputValue.call(urlInput, 'https://example.test/band');
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    mockDispatch.mockReturnValueOnce(Promise.resolve());
    await act(async () => {
      container
        .querySelector('form')
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        );
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'favorites/create',
      payload: {
        name: 'New band',
        type: 'band',
        url: 'https://example.test/band',
      },
    });
    expect(nameInput.value).toBe('');
    expect(urlInput.value).toBe('');
    unmount();
  });
});
