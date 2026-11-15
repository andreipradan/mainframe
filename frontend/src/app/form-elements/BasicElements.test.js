import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { BasicElements } from './BasicElements';

jest.mock('bs-custom-file-input', () => ({ init: jest.fn() }));
jest.mock('react-datepicker', () => {
  const React = require('react');
  return ({ selected, onChange }) =>
    React.createElement('input', {
      type: 'text',
      'data-testid': 'date-picker',
      value: selected?.toISOString() || '',
      onChange: () => onChange(new Date('2025-01-02T00:00:00Z')),
    });
});

test('renders form controls and updates its date picker', () => {
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => root.render(<BasicElements />));

  expect(container.textContent).toContain('Default form');
  expect(container.textContent).toContain('Horizontal Form');
  expect(container.querySelectorAll('input').length).toBeGreaterThan(5);
  container.querySelectorAll('a[href="!#"]').forEach((link) => {
    act(() => link.click());
  });

  const datePicker = container.querySelector('[data-testid="date-picker"]');
  act(() => Simulate.change(datePicker));
  expect(datePicker.value).toContain('2025-01-02');

  act(() => root.unmount());
});
