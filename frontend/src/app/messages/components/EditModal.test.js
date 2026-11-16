import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EditModal from './EditModal';
import { selectItem } from '../../../redux/messagesSlice';

let mockState = { messages: { selectedItem: null, loadingItems: [] } };
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../../redux/messagesSlice', () => ({
  selectItem: jest.fn(() => ({ type: 'messages/selectItem' })),
}));
jest.mock(
  'react-bootstrap/Modal',
  () => require('../../../testSupport/reactBootstrapMocks').Modal
);
jest.mock(
  'react-bootstrap/Button',
  () => require('../../../testSupport/reactBootstrapMocks').Button
);
jest.mock('react-loader-spinner', () => ({
  ColorRing: () => <div>Loading message</div>,
}));

const renderEditModal = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<EditModal />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('Messages EditModal', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    selectItem.mockClear();
    selectItem.mockReturnValue({ type: 'messages/selectItem' });
    mockState = {
      messages: {
        selectedItem: {
          id: 8,
          chat_title: 'General',
          author: { full_name: 'Automation Bot' },
          date: '2025-01-02T03:04:05Z',
          chat_id: 3,
          message_id: 12,
          saved_by: { first_name: 'Alex' },
          text: 'First line\nSecond line',
        },
        loadingItems: [],
      },
    };
  });

  test('renders a selected message and closes it', () => {
    const { container, unmount } = renderEditModal();

    expect(container.textContent).toContain('General');
    expect(container.textContent).toContain('Automation Bot');
    expect(container.textContent).toContain('Chat ID: 3');
    expect(container.textContent).toContain('Message ID: 12');
    expect(container.textContent).toContain('Saved by: Alex');
    expect(container.textContent).toContain('First line');
    expect(container.textContent).toContain('Second line');

    act(() => container.querySelector('footer button').click());
    expect(selectItem).toHaveBeenCalledWith();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'messages/selectItem',
    });
    unmount();
  });

  test('shows a loading indicator for a message being loaded', () => {
    mockState.messages.loadingItems = [8];
    const { container, unmount } = renderEditModal();
    expect(container.textContent).toContain('Loading message');
    unmount();
  });
});
