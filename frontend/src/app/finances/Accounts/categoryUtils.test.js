import { updateCheckedCategories } from './categoryUtils';

describe('updateCheckedCategories', () => {
  const category = { description: 'Coffee shop', category: 'food' };

  it('adds identified categories to an empty selection', () => {
    expect(updateCheckedCategories(null, category, true)).toEqual([category]);
  });

  it('removes a matching category when it becomes unidentified', () => {
    expect(updateCheckedCategories([category], category, false)).toEqual([]);
  });

  it('updates an existing category and appends a new one', () => {
    const updated = { ...category, category: 'restaurants' };
    const other = { description: 'Market', category: 'groceries' };

    expect(updateCheckedCategories([category, other], updated, true)).toEqual([
      updated,
      other,
    ]);
    expect(updateCheckedCategories([other], category, true)).toEqual([
      other,
      category,
    ]);
  });

  it('keeps the selection when an unidentified category is not present', () => {
    const categories = [category];

    expect(
      updateCheckedCategories(
        categories,
        { description: 'Market', category: 'Unidentified' },
        false
      )
    ).toBe(categories);
  });
});
