import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import "nouislider/distribute/nouislider.css";

import { TimetableApi } from "../../api/finance";
import { calculateSum } from "./utils";
import { useHistory } from "react-router-dom";
import { Circles } from "react-loader-spinner";
import Select from "react-select";
import { selectStyles } from "./Categorize/EditModal";
import { selectItem as selectTimetable } from "../../redux/timetableSlice";
import Errors from "../shared/Errors";

const Calculator = () => {
  const history = useHistory();
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)
  const timetable = useSelector(state => state.timetable)

  useEffect(() => {!timetable.selectedTimetable && dispatch(TimetableApi.getTimetables(token))}, [timetable.selectedTimetable])

  const latestTimetable = timetable.selectedTimetable?.amortization_table
  const currency = timetable.selectedTimetable?.credit?.currency

  const [calculatorAmount, setCalculatorAmount] = useState(0)
  const [calculatorMonths, setCalculatorMonths] = useState(0)
  const [calculatorSaved, setCalculatorSaved] = useState(0)
  const [otherAmounts, setOtherAmounts] = useState(null)

  useEffect(() => latestTimetable?.length && updateAmount(6000), [latestTimetable])

  const setSuggestions = index => {
    const suggestedAmounts = {}
    Array.from(new Array(7), (x, i) => i + index - 3).filter(i => i > 0).map(i => {
      suggestedAmounts[i] = calculateSum(latestTimetable.slice(0, i), "principal")
    })
    setOtherAmounts(suggestedAmounts)
    const saved = calculateSum(latestTimetable.slice(0, index), "interest")
    setCalculatorSaved(saved)
  }

  const onChangeTimetable = newValue => {
    dispatch(selectTimetable(newValue.value))
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
        Calculator
        {
          timetable.loading
            ? <Circles height={20} width={20} wrapperStyle={{display: "default"}} wrapperClass="btn"/>
            : <button type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(TimetableApi.getTimetables(token))}
              >
                <i className="mdi mdi-refresh"></i>
              </button>
        }
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
    <div className={"page-header"}>
      <h6 className={"page-title"}>
        {
          timetable.selectedTimetable
            ? <small className="text-muted">
                Timetable: {timetable.selectedTimetable.id === timetable.results[0].id ? `${timetable.selectedTimetable.date} (latest)` : timetable.selectedTimetable.date}<br/>
                Interest: {timetable.selectedTimetable.interest}%<br/>
                IRCC: {timetable.selectedTimetable.ircc}%<br/>
              </small>
            : null
        }
      </h6>
      {
        timetable.selectedTimetable
          ? <Select
            placeholder={"Timetable"}
            value={{label: `${timetable.selectedTimetable.id === timetable.results[0].id ? `${timetable.selectedTimetable.date} (latest)` : timetable.selectedTimetable.date}`, value: timetable.selectedTimetable.id}}
            onChange={onChangeTimetable}
            options={timetable.results.map((t, i) => ({label: `${i === 0 ? `${t.date} (latest)` : t.date}`, value: t.id}))}
            styles={selectStyles}
            closeMenuOnSelect={true}
          />
        : null
      }
    </div>
    <Errors errors={timetable.errors}/>

    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Prepayment calculator {currency ? `(${currency})` : null}
            <form className="nav-link mt-2 mt-md-0 search" onSubmit={e => e.preventDefault()}>
              <div className="row">
                <div className="col-md-4">
                  <input
                    disabled={!latestTimetable || timetable.loading}
                    type="search"
                    className="form-control bg-transparent"
                    placeholder="Amount"
                    value={calculatorAmount}
                    onChange={e => updateAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    disabled={!latestTimetable || timetable.loading}
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
                {Object.keys(otherAmounts).map(i => <li key={i} className={parseInt(i) === calculatorMonths ? "text-success" : "text-muted"}>
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