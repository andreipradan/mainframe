export const calculateSum = (list, field, condition = null) => parseFloat(
  list?.reduce(
    (partialSum, p) => {
      if (condition && !p[condition]) return partialSum
      return partialSum + parseFloat(p[field])
    },
    0
  ).toFixed(2)
)

export const getPassedMonths = payments =>  payments
  ? Object.values(
      payments?.reduce((acc, obj) => ({ ...acc, [obj.date.split("-").splice(0,2)]: obj }), {})
    ).length
  : 0