export const calculateSum = (list, field, condition = null) => list
  ? parseFloat(
    list?.reduce(
      (partialSum, p) => {
        if (condition && !p[condition]) return partialSum
        return partialSum + parseFloat(p[field])
      },
      0
    ).toFixed(2)
  )
  : 0

export const getPercentage = (x, y) => ( x / y * 100).toFixed(2)
