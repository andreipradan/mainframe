/** Updates the checked categories for a new category selection. */
export const updateCheckedCategories = (
  checkedCategories,
  newCategory,
  isIdentified
) => {
  if (!checkedCategories?.length) {
    return isIdentified ? [newCategory] : null;
  }

  const categoryExists = checkedCategories.some(
    (category) => category.description === newCategory.description
  );

  if (categoryExists && isIdentified) {
    return checkedCategories.map((category) =>
      category.description === newCategory.description
        ? { ...category, category: newCategory.category }
        : category
    );
  }

  if (categoryExists) {
    return checkedCategories.filter(
      (category) => category.description !== newCategory.description
    );
  }

  if (isIdentified) {
    return [...checkedCategories, newCategory];
  }

  return checkedCategories;
};
