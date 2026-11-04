import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from './App';

it('renders without crashing', async () => {
  const div = document.createElement('div');
  const sidebarDiv = document.createElement('div');
  sidebarDiv.id = 'sidebar';
  document.body.appendChild(sidebarDiv);
  const pageBody = document.createElement('div');
  pageBody.className = 'page-body-wrapper';
  document.body.appendChild(pageBody);
  // jsdom's default `window.scrollTo` throws 'Not implemented' — override it
  if (typeof window !== 'undefined') {
    window.scrollTo = jest.fn();
  }
  const initialState = {
    auth: {
      token: null,
      user: {
        is_staff: false,
        username: 'test',
        last_login: new Date().toISOString(),
      },
    },
    rpi: { errors: null, loading: false, message: null },
  };
  const store = configureStore({ reducer: (state = initialState) => state });
  const root = createRoot(div);
  await act(async () => {
    root.render(
      <Provider store={store}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </Provider>
    );
    // allow any suspended resources or microtasks to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await act(async () => {
    root.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  sidebarDiv.remove();
  pageBody.remove();
});

it('renders terms and conditions without authentication', async () => {
  const div = document.createElement('div');
  const pageBody = document.createElement('div');
  pageBody.className = 'page-body-wrapper';
  document.body.appendChild(pageBody);
  window.scrollTo = jest.fn();

  const initialState = {
    auth: {
      token: null,
      user: null,
    },
    rpi: { errors: null, loading: false, message: null },
  };
  const store = configureStore({ reducer: (state = initialState) => state });
  const root = createRoot(div);

  await act(async () => {
    root.render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/terms-and-conditions']}>
          <App />
        </MemoryRouter>
      </Provider>
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(div.textContent).toContain('Terms and Conditions');
  expect(div.textContent).toContain('Account Information');
  expect(div.textContent).toContain('Cookies and Browser Storage');

  act(() => {
    root.unmount();
  });
  pageBody.remove();
});
