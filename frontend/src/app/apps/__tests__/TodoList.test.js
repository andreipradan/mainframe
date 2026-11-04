import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TodoListComponent } from '../TodoList';

describe('TodoListComponent', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
    act(() => {
      root.render(<TodoListComponent />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  test('adds, completes, and removes a task with an accessible remove button', () => {
    const input = container.querySelector('input[type="text"]');
    const setInputValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    act(() => {
      setInputValue.call(input, 'Buy milk');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => {
      container
        .querySelector('form')
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        );
    });

    const task = container.querySelector('.todo-list li');
    expect(task.textContent).toContain('Buy milk');

    const checkbox = task.querySelector('input[type="checkbox"]');
    act(() => {
      checkbox.click();
    });
    expect(task.classList.contains('completed')).toBe(true);

    const removeButton = task.querySelector(
      'button[aria-label="Remove task Buy milk"]'
    );
    expect(removeButton).not.toBeNull();
    expect(removeButton.type).toBe('button');
    act(() => {
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('.todo-list').children).toHaveLength(0);
  });
});
