import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Buttons from './Buttons';

test('renders the button examples and their styles', () => {
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => root.render(<Buttons />));

  expect(container.textContent).toContain('Normal buttons');
  expect(container.textContent).toContain('Rounded buttons');
  expect(container.querySelectorAll('button.btn').length).toBeGreaterThan(100);
  container.querySelectorAll('a[href="!#"]').forEach((link) => {
    act(() => link.click());
  });

  act(() => root.unmount());
});
