export const calculateSum = (list, field, condition = null, decimals = 2) =>
  list
    ? Number.parseFloat(
        list
          ?.reduce((partialSum, p) => {
            if (condition && !p[condition]) return partialSum;
            return partialSum + Number.parseFloat(p[field]);
          }, 0)
          .toFixed(decimals)
      )
    : 0;

export const getPercentage = (x, y) => ((x / y) * 100).toFixed(2);

export const setsAreEqual = (setA, setB) => {
  if (setA.size !== setB.size) {
    return false;
  }
  for (const element of setA) {
    if (!setB.has(element)) {
      return false;
    }
  }
  return true;
};
