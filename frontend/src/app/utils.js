export const capitalize = str => `${str[0].toUpperCase()}${str.slice(1, str.length).toLowerCase()}`
export const getCategoryVerbose = categoryId => categoryId ? capitalize(categoryId.replace("-", " ")) : ""
