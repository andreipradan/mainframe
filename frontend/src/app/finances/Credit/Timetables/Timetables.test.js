import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Timetables from './Timetables';
import TimetableEditModal from './components/TimetableEditModal';

let mockState;
const mockDispatch = jest.fn();
const mockHistory = { push: jest.fn() };
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => mockHistory,
}));
jest.mock('../../../../api/finance', () => ({
  TimetableApi: class TimetableApiMock {
    getList() {
      return { type: 'timetable/getList' };
    }

    getItem(id) {
      return { type: 'timetable/getItem', payload: id };
    }

    delete(id) {
      return { type: 'timetable/delete', payload: id };
    }

    upload(payload) {
      return { type: 'timetable/upload', payload };
    }
  },
}));
jest.mock('../../../shared/BottomPagination', () => () => null);
jest.mock('../../../shared/Errors', () => ({ errors }) => (
  <div>{errors?.[0] || errors?.detail || null}</div>
));
jest.mock('react-loader-spinner', () => ({
  Circles: () => <div>Loading timetables</div>,
  ColorRing: () => <div>Loading timetable</div>,
}));
jest.mock('react-bootstrap', () => ({
  Collapse: ({ children }) => <>{children}</>,
}));
jest.mock('react-bootstrap/Form', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Control = (props) => React.createElement('input', props);
  return { __esModule: true, default: Form };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', { 'data-show': show }, children) : null;
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  return {
    __esModule: true,
    default: Modal,
    Body: Modal.Body,
    Footer: Modal.Footer,
    Header: Modal.Header,
    Title: Modal.Title,
  };
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});

const render = (component) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(component));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const setFile = (input, file) => {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
};

describe('Timetables', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockHistory.push.mockClear();
    mockState = {
      auth: { token: 'token' },
      timetable: {
        count: 1,
        errors: null,
        loading: false,
        loadingItems: [],
        results: [
          {
            id: 1,
            date: '2025-01-01',
            interest: 5,
            margin: 2,
            ircc: 3,
            amortization_table: [{ date: '2025-02-01' }],
          },
        ],
        selectedItem: null,
      },
    };
  });

  test('renders and selects a timetable and navigates to credit details', () => {
    const { container, unmount } = render(<Timetables />);
    expect(container.textContent).toContain('2025-01-01');

    act(() => container.querySelector('tbody tr').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'timetable/selectItem',
      payload: 1,
    });

    act(() =>
      Array.from(container.querySelectorAll('a'))
        .find((anchor) => anchor.textContent === 'Credit')
        .click()
    );
    expect(mockHistory.push).toHaveBeenCalledWith('/finances/credit/details');
    unmount();
  });

  test('uploads a PDF, handles empty/loading lists, and renders timetable details', () => {
    mockState.timetable.results = [];
    mockState.timetable.errors = ['Upload failed'];
    mockState.timetable.loading = true;
    const loading = render(<Timetables />);
    expect(loading.container.textContent).toContain('Loading timetables');
    loading.unmount();

    mockState.timetable.loading = false;
    const empty = render(<Timetables />);
    expect(empty.container.textContent).toContain('Upload failed');
    expect(empty.container.textContent).toContain('No timetables found');
    act(() =>
      Array.from(empty.container.querySelectorAll('button'))
        .find((button) => button.className.includes('float-right'))
        .click()
    );
    const fileInput = empty.container.querySelector('input[type="file"]');
    setFile(fileInput, { name: 'bad.csv' });
    expect(empty.container.textContent).toContain('File must be pdf!');
    setFile(fileInput, { name: 'schedule.pdf' });
    expect(empty.container.textContent).toContain('schedule.pdf');
    act(() =>
      empty.container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'timetable/upload' })
    );
    empty.unmount();

    mockState.timetable.errors = null;
    mockState.timetable.selectedItem = {
      id: 4,
      date: '2025-03-01',
      amortization_table: [
        {
          date: '2025-04-01',
          total: '100',
          principal: '80',
          interest: '10',
          insurance: '5',
          remaining: '900',
        },
      ],
    };
    mockState.timetable.loadingItems = [4];
    const loadingModal = render(<TimetableEditModal />);
    expect(loadingModal.container.textContent).toContain('Loading timetable');
    loadingModal.unmount();

    mockState.timetable.loadingItems = [];
    const details = render(<TimetableEditModal />);
    expect(details.container.textContent).toContain('Amortization Table');
    expect(details.container.textContent).toContain('2025-04-01');
    act(() => details.container.querySelector('button').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'timetable/getItem',
      payload: 4,
    });
    act(() =>
      Array.from(details.container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Delete')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'timetable/delete',
      payload: 4,
    });
    details.unmount();

    mockState.timetable.selectedItem = {
      id: 5,
      date: '2025-05-01',
      amortization_table: [],
    };
    const noRows = render(<TimetableEditModal />);
    expect(noRows.container.textContent).toContain('No timetables found');
    noRows.unmount();
  });
});
