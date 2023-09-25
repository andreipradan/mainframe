import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import Alert from "react-bootstrap/Alert";
import "nouislider/distribute/nouislider.css";

import { FinanceApi } from "../../api/finance";
import { calculateSum } from "./utils";
import { useHistory } from "react-router-dom";

const Calculator = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const overview = useSelector(state => state.credit)
  const [overviewAlertOpen, setOverviewAlertOpen] = useState(false)
  useEffect(() => {setOverviewAlertOpen(!!overview.errors)}, [overview.errors])
  useEffect(() => {
    if (!overview.details) dispatch(FinanceApi.getCredit(token))
    }, [overview.details]
  );
  const credit = overview.details?.credit
  const latestTimetable = overview.details?.latest_timetable.amortization_table

  const [otherAmounts, setOtherAmounts] = useState(null)
  const [calculatorAmount, setCalculatorAmount] = useState(0)
  const [calculatorMonths, setCalculatorMonths] = useState(0)
  const [calculatorSaved, setCalculatorSaved] = useState(0)

  useEffect(() => latestTimetable?.length && updateAmount(parseInt(latestTimetable[0].principal)+1), [latestTimetable])

  const setSuggestions = index => {
    const suggestedAmounts = {}
    if (index - 2 > 0) suggestedAmounts[index-2] = calculateSum(latestTimetable.slice(0, index-2), "principal")
    if (index - 1 > 0) suggestedAmounts[index-1] = calculateSum(latestTimetable.slice(0, index-1), "principal")
    if (index + 1 <= latestTimetable.length) suggestedAmounts[index+1] = calculateSum(latestTimetable.slice(0, index+1), "principal")
    if (index + 2 <= latestTimetable.length) suggestedAmounts[index+2] = calculateSum(latestTimetable.slice(0, index+2), "principal")
    setOtherAmounts(suggestedAmounts)
    const saved = calculateSum(latestTimetable.slice(0, index), "interest")
    setCalculatorSaved(saved)
  }

  const updateAmount = value => {
    setCalculatorAmount(value)
    if (!latestTimetable) return
    let amount = 0
    let index = 0
    for (const [i, item] of latestTimetable.entries()) {
      const principal = parseFloat(item.principal)
      if (amount + principal > value) {
        index = i
        break;
      }
      amount += principal
    }
    setCalculatorMonths(index)
    setSuggestions(index)
  }
  const updateMonths = value => {
    setCalculatorMonths(value)
    if (!latestTimetable) return
    const amount = calculateSum(latestTimetable.slice(0, value), "principal")
    setCalculatorAmount(amount)
    setSuggestions(value)
  }

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Credit
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(FinanceApi.getCredit(token))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item"><a href="/finances/credit/details" onClick={event => {
            event.preventDefault()
            history.push("/finances/credit/details")
          }}>Credit</a></li>
          <li className="breadcrumb-item active" aria-current="page">Calculator</li>
        </ol>
      </nav>
    </div>
    {overviewAlertOpen && <Alert variant="danger" dismissible onClose={() => setOverviewAlertOpen(false)}>{overview.errors}</Alert>}

    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Prepayment calculator {credit?.currency ? `(${credit.currency})` : null}
            <form className="nav-link mt-2 mt-md-0 search" onSubmit={e => e.preventDefault()}>
              <div className="row">
                <div className="col-md-4">
                  <input
                    disabled={!latestTimetable}
                    type="search"
                    className="form-control bg-transparent"
                    placeholder="Amount"
                    value={calculatorAmount}
                    onChange={e => updateAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    disabled={!latestTimetable}
                    type="number"
                    className="form-control bg-transparent"
                    placeholder="# of months"
                    value={calculatorMonths}
                    onChange={e => updateMonths(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    disabled={true}
                    type="search"
                    className="form-control bg-transparent"
                    placeholder="Saved"
                    value={calculatorSaved}
                    onChange={e => setCalculatorSaved(parseFloat(e.target.value))}
                  />
                </div>

              </div>
            </form>
            {
              otherAmounts && <div className="text-muted small">
              Other Amounts:
              <ul>
                {Object.keys(otherAmounts).map(i => <li key={i}>
                  {i} month(s): {otherAmounts[i].toFixed(2)}
                </li>)}
              </ul>
              </div>
            }
            </h6>
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Calculator;