import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BasicTable from './BasicTable';

test('renders all sample profile images', () => {
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => root.render(<BasicTable />));

  const images = container.querySelectorAll('img[alt="user icon"]');
  expect(images).toHaveLength(7);
  images.forEach((image) => {
    expect(image.getAttribute('src')).toBeTruthy();
  });
  act(() => container.querySelector('a[href="!#"]').click());

  act(() => root.unmount());
});
