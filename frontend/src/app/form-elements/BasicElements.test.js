import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { BasicElements } from './BasicElements';

vi.mock('bs-custom-file-input', () => ({
  default: { init: vi.fn() },
}));
vi.mock('react-datepicker', () => {
  return {
    default: ({ selected, onChange }) =>
      React.createElement('input', {
        type: 'text',
        'data-testid': 'date-picker',
        value: selected?.toISOString() || '',
        onChange: () => onChange(new Date('2025-01-02T00:00:00Z')),
      }),
  };
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

test('Cancel buttons use native reset behavior for their forms', () => {
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => root.render(<BasicElements />));

  const cancelButtons = Array.from(container.querySelectorAll('button')).filter(
    (button) => button.textContent.trim() === 'Cancel'
  );
  expect(cancelButtons).toHaveLength(3);

  cancelButtons.forEach((button) => {
    const form = button.closest('form');
    const textInput = form.querySelector('input[type="text"]');
    expect(button.type).toBe('reset');

    textInput.value = 'changed';
    form.reset();

    expect(textInput.value).toBe('');
  });

  act(() => root.unmount());
});
