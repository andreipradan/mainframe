import React, { useEffect, useState } from 'react';
import { Circles } from "react-loader-spinner";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import Select from "react-select";
import "nouislider/distribute/nouislider.css";

import { calculateSum } from "../utils";
import { selectItem as selectTimetable } from "../../../redux/timetableSlice";
import { selectStyles } from "../Accounts/Categorize/EditModal";
import { TimetableApi } from "../../../api/finance";
import Errors from "../../shared/Errors";

const PMT = (ir, np, pv, fv, type) => {
    let pmt, pvif;
    
    
    if (ir === 0) return -(pv + fv)/np;
    pvif = Math.pow(1 + ir, np);
    pmt = - ir * (pv * pvif + fv) / (pvif - 1);
    if (type === 1) pmt /= (1 + ir);
    return pmt;
}

const Calculator = () => {
  const history = useHistory();
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)
  const timetable = useSelector(state => state.timetable)

  useEffect(() => {!timetable.selectedItem && dispatch(TimetableApi.getTimetables(token))}, [timetable.selectedItem])
  useEffect(() => {!timetable.selectedItem && timetable.results?.length && dispatch(selectTimetable(timetable.results[0].id))}, [timetable.results])

  const latestTimetable = timetable.selectedItem?.amortization_table
  const currency = timetable.selectedItem?.credit?.currency

  const [durationAmount, setDurationAmount] = useState(6000)
  const [durationMonths, setDurationMonths] = useState(0)
  const [durationSaved, setDurationSaved] = useState(0)
  const [durationOtherAmounts, setDurationOtherAmounts] = useState(null)

  const [monthlyAmount, setMonthlyAmount] = useState(0)
  const [monthlyError, setMonthlyError] = useState('')
  const [monthlyOtherAmounts, setMonthlyOtherAmounts] = useState(null)

  useEffect(() => {
      if (latestTimetable?.length) {
        updateDurationAmount(6000)
        setMonthlyAmount(Math.round((parseFloat(latestTimetable[0].total) + 2500)/500) * 500)
      }
    },
    [latestTimetable]
  )

  useEffect(() => {
    if (latestTimetable?.length) {
      setMonthlySuggestions()
      setMonthlyError(monthlyAmount < latestTimetable[0].total ? `Amount must be >= ${latestTimetable[0].total}` : "")
    }
  }, [monthlyAmount]);

  const onChangeTimetable = newValue => {dispatch(selectTimetable(newValue.value))}

  const setDurationSuggestions = index => {
    const suggestedAmounts = {}
    Array.from(new Array(5), (x, i) => i + index - 2).filter(i => i > 0).map(i => {
      suggestedAmounts[i] = calculateSum(latestTimetable.slice(0, i), "principal")
    })
    setDurationOtherAmounts(suggestedAmounts)
    const saved = (
      calculateSum(latestTimetable.slice(0, index), "interest")
      + calculateSum(latestTimetable.slice(0, index), "insurance")
    ).toFixed(2)
    setDurationSaved(saved)
  }

  const updateDurationAmount = value => {
    setDurationAmount(value)
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
    setDurationMonths(index)
    setDurationSuggestions(index)
  }
  const updateDurationMonths = value => {
    setDurationMonths(value)
    if (!latestTimetable) return
    const amount = calculateSum(latestTimetable.slice(0, value), "principal")
    setDurationAmount(amount)
    setDurationSuggestions(value)
  }

  const setMonthlySuggestions = () => {
    const suggestedAmounts = {}
    const remaining = calculateSum(latestTimetable, "principal")
    const interest = timetable.selectedItem.interest / 100
    Array.from(new Array(latestTimetable.length), (x, i) => i).filter(i => i > 0).map(i => {
      const rem = remaining - (monthlyAmount * i)
      const inter = interest * rem / 12
      const remainingMonths = latestTimetable.length - i;
      const newRate = -PMT(interest / 12, remainingMonths + 1, rem)
      if (rem > 0)
        suggestedAmounts[i] = {
          rate: newRate.toFixed(2),
          interest: inter.toFixed(2),
          principal: (newRate - inter).toFixed(2),
          remaining: rem.toFixed(2),
          months: remainingMonths
        }
    })
    setMonthlyOtherAmounts(suggestedAmounts)
  }

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Prepayment calculator
        {
          timetable.loading
            ? <Circles height={20} width={20} wrapperStyle={{display: "default"}} wrapperClass="btn"/>
            : <button type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(TimetableApi.getTimetables(token))}
              >
                <i className="mdi mdi-refresh" />
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
          timetable.selectedItem
            ? <small className="text-muted">
                Timetable: {timetable.selectedItem.id === timetable.results[0].id ? `${timetable.selectedItem.date} (latest)` : timetable.selectedItem.date}<br/>
                Interest: {timetable.selectedItem.interest}%&nbsp;
                (ircc: {timetable.selectedItem.ircc}%)<br/>
                Remaining: {calculateSum(latestTimetable, "principal")} {currency ? currency : null}<br />
                Months: {latestTimetable.length}<br/>
                Next payment: {latestTimetable[0].total} (p: {latestTimetable[0].principal}, i: {latestTimetable[0].interest})
              </small>
            : null
        }
      </h6>
      {
        timetable.selectedItem
          ? <Select
            placeholder={"Timetable"}
            value={{label: `${timetable.selectedItem.id === timetable.results[0].id ? `${timetable.selectedItem.date} (latest)` : timetable.selectedItem.date}`, value: timetable.selectedItem.id}}
            onChange={onChangeTimetable}
            options={timetable.results.map((t, i) => ({label: `${i === 0 ? `${t.date} (latest)` : t.date}`, value: t.id}))}
            styles={selectStyles}
            closeMenuOnSelect
          />
        : null
      }
    </div>
    <Errors errors={timetable.errors}/>
    <div className="row">
      <div className="col-sm-6 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Reduce duration
            <form className="nav-link mt-2 mt-md-0 search" onSubmit={e => e.preventDefault()}>
              <div className="row">
                <div className="col-md-4">
                  <input
                    disabled={!latestTimetable || timetable.loading}
                    type="search"
                    className="form-control bg-transparent"
                    placeholder="Amount"
                    value={durationAmount}
                    onChange={e => updateDurationAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-md-3">
                  <input
                    disabled={!latestTimetable || timetable.loading}
                    type="number"
                    className="form-control bg-transparent"
                    placeholder="# of months"
                    value={durationMonths}
                    onChange={e => updateDurationMonths(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="col-md-5 pt-2" style={{textAlign: "center"}}>
                  Saved: RON {durationSaved}
                </div>

              </div>
            </form>
            {
              durationOtherAmounts && <div className="text-muted small">
              Other Amounts:
              <ul>
                {Object.keys(durationOtherAmounts).map(i => <li key={i} className={parseInt(i) === durationMonths ? "text-success" : "text-muted"}>
                  {i} month(s): {durationOtherAmounts[i].toFixed(2)}
                </li>)}
              </ul>
              </div>
            }
            </h6>
          </div>
        </div>
      </div>
      <div className="col-sm-6 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Reduce monthly payment
              <div className="nav-link mt-2 mt-md-0 search">
                <div className="row">
                  <div className="col-md-4">
                    <input
                      className={`form-control bg-transparent ${monthlyError ? 'is-invalid' : ''}`}
                      disabled={!latestTimetable || timetable.loading}
                      min={Math.round((parseFloat(latestTimetable?.[0].total) + 2500)/500) * 500}
                      onChange={e => setMonthlyAmount(parseFloat(e.target.value) || 0)}
                      placeholder="Amount"
                      step={500}
                      type="number"
                      value={monthlyAmount}
                    />
                    <small>{monthlyError}</small>
                  </div>
                  <div className="col-md-5 pt-2" style={{textAlign: "center"}}>
                    Maturity in: {Object.keys(monthlyOtherAmounts || {}).length} months
                  </div>
                </div>
              </div>
              {
                monthlyOtherAmounts && <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th> # </th>
                        <th> Total </th>
                        <th> Interest </th>
                        <th> Principal </th>
                        <th> Remaining </th>
                        <th> Maturity </th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        Object.keys(monthlyOtherAmounts).map((i) =>
                          <tr key={i}>
                            <td>{i}</td>
                            <td>{monthlyOtherAmounts[i].rate}</td>
                            <td>{monthlyOtherAmounts[i].interest}</td>
                            <td>{monthlyOtherAmounts[i].principal}</td>
                            <td>{monthlyOtherAmounts[i].remaining}</td>
                            <td>{monthlyOtherAmounts[i].months}</td>
                          </tr>
                        )
                      }
                    </tbody>
                  </table>
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