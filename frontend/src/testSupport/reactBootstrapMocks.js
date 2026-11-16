const React = require('react');

/** Provides the modal shell used by tests that mock React Bootstrap. */
function Modal({ children, show }) {
  return show ? React.createElement('div', { role: 'dialog' }, children) : null;
}

Modal.Header = function ModalHeader({ children }) {
  return React.createElement('header', null, children);
};
Modal.Title = function ModalTitle({ children }) {
  return React.createElement('h2', null, children);
};
Modal.Body = function ModalBody({ children }) {
  return React.createElement('section', null, children);
};
Modal.Footer = function ModalFooter({ children }) {
  return React.createElement('footer', null, children);
};

/** Provides the button replacement used by shared component tests. */
function Button({ children, ...props }) {
  return React.createElement('button', props, children);
}

module.exports = {
  Modal: { __esModule: true, default: Modal },
  Button: { __esModule: true, default: Button },
};
