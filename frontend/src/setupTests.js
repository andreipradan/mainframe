/* global jest */

// Setup test environment overrides
// Tell React that the test environment supports `act()` (React 18+)
if (typeof global !== 'undefined') {
  global.IS_REACT_ACT_ENVIRONMENT = true;
}
// Mock CSS imports that some node_modules include and that break Jest's parser
const cssModules = [
  'react-toastify/dist/ReactToastify.css',
  'react-datepicker/dist/react-datepicker.css',
];

if (typeof jest !== 'undefined' && typeof jest.mock === 'function') {
  cssModules.forEach((m) => {
    jest.mock(m, () => ({}));
  });

  // Some libraries (ace-builds) include webpack-specific resolver imports that
  // Jest can't resolve. Provide lightweight mocks here to avoid errors.
  jest.mock('ace-builds/webpack-resolver', () => ({}));
  jest.mock('ace-builds', () => ({}));
}

// jsdom doesn't implement window.scrollTo; provide a noop to avoid warnings/errors
if (typeof window !== 'undefined' && typeof window.scrollTo !== 'function') {
  window.scrollTo = () => {};
}

// Provide a minimal Leaflet global used by some side-effecting modules (e.g.
// leaflet.fullscreen) so they don't throw during import in Jest.
if (typeof window !== 'undefined' && typeof window.L === 'undefined') {
  window.L = {
    Control: { extend: () => ({}) },
    extend: () => ({}),
    divIcon: () => ({}),
    icon: () => ({}),
    control: {
      fullscreen: () => ({
        addTo: () => {},
        remove: () => {},
      }),
    },
  };
}
