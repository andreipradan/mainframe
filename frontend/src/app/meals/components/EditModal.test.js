import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EditModal from './EditModal';
import { selectItem } from '../../../redux/mealsSlice';

let mockState = { meals: { selectedItem: null } };
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../../redux/mealsSlice', () => ({
  selectItem: jest.fn(() => ({ type: 'meals/selectItem' })),
}));
jest.mock(
  'react-bootstrap/Modal',
  () => require('../../../testSupport/reactBootstrapMocks').Modal
);
jest.mock(
  'react-bootstrap/Button',
  () => require('../../../testSupport/reactBootstrapMocks').Button
);

const renderEditModal = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<EditModal />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('Meals EditModal', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    selectItem.mockClear();
    selectItem.mockReturnValue({ type: 'meals/selectItem' });
    mockState = {
      meals: {
        selectedItem: {
          name: 'Lunch',
          date: '2025-01-02',
          type_verbose: 'Main meal',
          ingredients: ['rice', 'beans'],
          quantities: { rice: 200, beans: 100 },
          nutritional_values: { calories: 240, protein: 12 },
        },
      },
    };
  });

  test('renders meal details and closes the selected meal', () => {
    const { container, unmount } = renderEditModal();

    expect(container.textContent).toContain('Lunch');
    expect(container.textContent).toContain('Main meal');
    expect(
      Array.from(container.querySelectorAll('li')).map(
        (item) => item.textContent
      )
    ).toEqual(['rice', 'beans', 'rice - 200', 'beans - 100']);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);

    act(() => container.querySelector('footer button').click());
    expect(selectItem).toHaveBeenCalledWith();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'meals/selectItem',
    });

    unmount();
  });

  test('does not show a modal without a selected meal', () => {
    mockState.meals.selectedItem = null;
    const { container, unmount } = renderEditModal();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    unmount();
  });
});
