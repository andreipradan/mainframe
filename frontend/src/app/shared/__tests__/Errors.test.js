import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

// Mock Alert to keep output simple
jest.mock('react-bootstrap/Alert', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: ({ children }) => React.createElement('div', { 'data-testid': 'alert' }, children),
  }
})

const Errors = require('../Errors').default

function render(component) {
  const div = document.createElement('div')
  document.body.appendChild(div)
  const root = createRoot(div)
  act(() => {
    root.render(component)
  })
  return { container: div, unmount: () => { act(() => root.unmount()); div.remove(); } }
}

describe('Errors component', () => {
  test('renders string error', () => {
    const { container, unmount } = render(React.createElement(Errors, { errors: 'oops' }))
    expect(container.textContent).toContain('oops')
    unmount()
  })

  test('renders array of errors', () => {
    const { container, unmount } = render(React.createElement(Errors, { errors: ['a','b'] }))
    expect(container.querySelectorAll('li').length).toBeGreaterThanOrEqual(2)
    unmount()
  })

  test('renders object errors', () => {
    const err = { field: ['one','two'], other: 'x' }
    const { container, unmount } = render(React.createElement(Errors, { errors: err }))
    expect(container.textContent).toContain('field:')
    expect(container.textContent).toContain('other: x')
    unmount()
  })

  test('renders nothing when no errors', () => {
    const { container, unmount } = render(React.createElement(Errors, { errors: null }))
    expect(container.textContent).toBe('')
    unmount()
  })
})
