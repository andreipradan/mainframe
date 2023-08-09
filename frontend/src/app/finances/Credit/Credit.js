import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";

import FinanceApi from "../../../api/finance";
import ListItem from "../shared/ListItem";
import {calculateSum, getPercentage} from "../utils";
import Alert from "react-bootstrap/Alert";
import { Bar, Doughnut } from "react-chartjs-2";
import {ProgressBar} from "react-bootstrap";
import {Tooltip} from "react-tooltip";
import {selectPayment} from "../../../redux/paymentSlice";
import PaymentEditModal from "./components/PaymentEditModal";
import TimetableEditModal from "./components/TimetableEditModal";
import Marquee from "react-fast-marquee";
import {selectTimetable} from "../../../redux/timetableSlice";

const Credit = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const overview = useSelector(state => state.credit)
  const [overviewAlertOpen, setOverviewAlertOpen] = useState(false)
  useEffect(() => {setOverviewAlertOpen(!!overview.errors)}, [overview.errors])
  useEffect(() => {!overview.details && dispatch(FinanceApi.getCredit(token))}, []);
  const credit = overview.details?.credit
  const latestTimetable = overview.details?.latest_timetable.amortization_table

  const payment = useSelector(state => state.payment)
  const [paymentAlertOpen, setPaymentAlertOpen] = useState(false)
  useEffect(() => {setPaymentAlertOpen(!!payment.errors)}, [payment.errors])
  useEffect(() => {!payment.results && dispatch(FinanceApi.getCreditPayments(token))}, []);

  const timetable = useSelector(state => state.timetable)
  const [timetableAlertOpen, setTimetableAlertOpen] = useState(false)
  useEffect(() => {setTimetableAlertOpen(!!timetable.errors)}, [timetable.errors])
  useEffect(() => {!timetable.results && dispatch(FinanceApi.getCreditTimetables(token))}, []);

  const paidTotal = calculateSum(payment.results, "total")
  const paidInterest = calculateSum(payment.results, "interest")
  const paidPrincipal = calculateSum(payment.results, "principal")
  const paidPrepaid = calculateSum(payment.results, "total", "is_prepayment")

  const remainingPrincipal = calculateSum(latestTimetable, "principal")
  const remainingInterest = calculateSum(latestTimetable, "interest")
  const remainingInsurance = calculateSum(latestTimetable, "insurance")
  const remainingTotal = (remainingPrincipal + remainingInterest + remainingInsurance).toFixed(2)

  const saved = calculateSum(payment.results, "saved")

  const [excludePrepayments, setExcludePrepayments] = useState(false)
  const [barChartPrincipal, setBarChartPrincipal] = useState(null)
  const [barChartInterest, setBarChartInterest] = useState(null)
  const [barChartLabels, setBarChartLabels] = useState(null)
  useEffect(() => setBarChartPrincipal(payment.results?.map(p => p.principal).reverse()), [payment.results])
  useEffect(() => setBarChartInterest(payment.results?.map(p => p.interest).reverse()), [payment.results])
  useEffect(() => setBarChartLabels(payment.results?.map(p => p.date).reverse()), [payment.results])

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
  const paidData = {
    datasets: [{
      data: [paidInterest, paidPrincipal],
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(75, 192, 192, 0.5)',
      ],
      borderColor: [
        'rgba(255,99,132,1)',
        'rgba(75, 192, 192, 1)',
      ],
    }],
    labels: ['Interest', 'Principal']
  };
  const remainingData = {
    datasets: [{
      data: [remainingInterest, remainingPrincipal, remainingInsurance],
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(255, 206, 86, 0.5)',
      ],
      borderColor: [
        'rgba(255,99,132,1)',
        'rgba(75, 192, 192, 1)',
        'rgba(255, 206, 86, 1)',
      ],
    }],
    labels: ['Interest', 'Principal', 'Insurance']
  };

  const doughnutPieOptions = {
    responsive: true,
    animation: {animateScale: true, animateRotate: true},
    tooltips: {
      callbacks: {
        label: function(tooltipItem, data) {
          let dataset = data.datasets[tooltipItem.datasetIndex];
          let meta = dataset._meta[Object.keys(dataset._meta)[0]];
          let total = meta.total;
          let currentValue = dataset.data[tooltipItem.index];
          let percentage = parseFloat((currentValue/total*100).toFixed(1));
          return currentValue + ' (' + percentage + '%)';
        },
        title: (tooltipItem, data) => data.labels[tooltipItem[0].index]
      }
    }
  };

  const paymentsData = {
    labels: barChartLabels,
    datasets: [
      {
        label: 'Principal',
        data: barChartPrincipal,
        backgroundColor: context => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(243,16,65,0.2)');
          gradient.addColorStop(0.5, 'rgb(255,210,64, 0.2)');
          gradient.addColorStop(1, 'rgba(47,113,190,0.2)');
          return gradient;
        },
        borderColor: context => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, context.height || 100);
          gradient.addColorStop(0, 'rgba(243,16,65,1)');
          gradient.addColorStop(0.5, 'rgb(255,210,64, 1)');
          gradient.addColorStop(1, 'rgb(47,113,190)');
          return gradient;
        },
        borderWidth: 1,
        fill: false
      },
      {
        label: "Interest",
        data: barChartInterest,
        backgroundColor: 'rgba(255,0,52,0.2)',
        borderColor: 'rgba(255,0,52,1)',
        borderWidth: 1,
        fill: false,
      },
    ]
  };

  const paymentsOptions = {
    scales: {
      yAxes: [{
        ticks: {beginAtZero: true},
        gridLines: {color: "rgba(204, 204, 204,0.1)"},
        stacked: true,
      }],
      xAxes: [{gridLines: {color: "rgba(204, 204, 204,0.1)"}, stacked: true}]
    },
    legend: {display: true},
    elements: {point: {radius: 0}},
    tooltips: {
      callbacks: {
        label: (tooltipItem, data) => {
          const otherValue = data.datasets[tooltipItem.datasetIndex === 0 ? 1 : 0].data[tooltipItem.index]
          const currentValue = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
          const percentage = parseFloat((currentValue / (parseFloat(currentValue) + parseFloat(otherValue)) * 100).toFixed(1));
          return data.datasets[tooltipItem.datasetIndex].label + ": " + currentValue + ' (' + percentage + '%)';
        },
        title: (tooltipItem, data) => {
          const item = tooltipItem[0]
          const otherValue = parseFloat(data.datasets[item.datasetIndex === 0 ? 1 : 0].data[item.index])
          const currentValue = parseFloat(data.datasets[item.datasetIndex].data[item.index]);
          return `Total: ${currentValue + otherValue}`
        }
      }
    }
  }

  const onExcludePrepaymentsChange = (e) => {
    if (e.target.checked) {
      setBarChartPrincipal(payment.results?.filter(p => !p.is_prepayment).map(p => p.principal).reverse())
      setBarChartInterest(payment.results?.filter(p => !p.is_prepayment).map(p => p.interest).reverse())
      setBarChartLabels(payment.results?.filter(p => !p.is_prepayment).map(p => p.date).reverse())
    } else {
      setBarChartPrincipal(payment.results?.map(p => p.principal).reverse())
      setBarChartInterest(payment.results?.map(p => p.interest).reverse())
      setBarChartLabels(payment.results?.map(p => p.date).reverse())
    }
    setExcludePrepayments(!excludePrepayments)
  }

  return <div>
    <div className="page-header">
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
        <li className="breadcrumb-item active" aria-current="page">Credit</li>
        </ol>
      </nav>
    </div>
    {overviewAlertOpen && <Alert variant="danger" dismissible onClose={() => setOverviewAlertOpen(false)}>{overview.errors}</Alert>}
    {paymentAlertOpen && <Alert variant="danger" dismissible onClose={() => setPaymentAlertOpen(false)}>{payment.errors}</Alert>}

    <div className="row">
      <div className="col-sm-12 col-lg-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Summary</h5>
            {
              overview.loading
                ? <Circles />
                : credit
                  ? <>
                    <ListItem label={"Credit"} value={credit.total} textType={"primary"}/>
                    <ListItem label={"Date"} value={credit.date} textType={"warning"}/>
                    <ListItem label={"Months"} value={`${credit.number_of_months} (${credit.number_of_months / 12} yrs)`} />
                    <ListItem label={"Saved"} value={saved} textType={"success"}/>
                    <ListItem label={"~Total"} value={(paidTotal + parseFloat(remainingTotal)).toFixed(2)} textType={"warning"}/>
                    <ListItem label={"~Interest"} value={(paidInterest + remainingInterest).toFixed(2)} textType={"danger"}/>
                  </>
                  : "-"
            }
            </div>
          </div>
      </div>
      <div className="col-sm-12 col-lg-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Remaining</h5>
            {
              overview.loading
                ? <Circles />
                : overview.details
                  ? <>
                    <ListItem label={"Total"} value={remainingTotal} textType={"primary"}/>
                    <ListItem label={"Date"} value={latestTimetable[latestTimetable.length - 1]?.date} textType={"warning"} />
                    <ListItem label={"Months"} value={`${latestTimetable.length} (${(latestTimetable.length / 12).toFixed(1)} yrs)`} />
                    <ListItem label={"Insurance"} value={remainingInsurance} />
                    <ListItem label={"Principal"} value={remainingPrincipal} textType={"success"} />
                    <ListItem label={"Interest"} value={remainingInterest} textType={"danger"}/>
                  </>
                  : "-"
            }
          </div>
        </div>
      </div>
      <div className="col-sm-12 col-lg-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              Paid
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getCreditPayments(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h5>
            {
              payment.loading
                ? <Circles />
                : payment.results?.length
                  ? <>
                    <ListItem label={"Total"} value={paidTotal} textType={"primary"} tooltip="paid-percentage" />
                    <ListItem label={"Date"} value={new Date().toISOString().split("T")[0]} textType={"warning"} />
                    <ListItem label={"Payments"} value={payment.results.length} />
                    <ListItem label={"Prepaid"} value={paidPrepaid} textType={"success"} tooltip="prepaid-percentage" />
                    <ListItem label={"Principal"} value={paidPrincipal} textType={"success"} tooltip={"principal-percentage"} />
                    <ListItem label={"Interest"} value={paidInterest} textType={"danger"} tooltip={"interest-percentage"} />
                  </>
                  : "-"
            }
          </div>
        </div>
      </div>
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              Progress: {getPercentage(paidTotal, remainingTotal)}%
              &nbsp;<i id="progress-bar-tip" className="mdi mdi-information-outline"/>
            </h5>
            {
              overview.loading || payment.loading
                ? <Circles />
                : credit ? <ProgressBar now={paidPrincipal} max={credit.total}/> : "-"
            }
            </div>
          </div>
      </div>
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Last Payment</h6>
            {
              payment.loading
                ? <Circles />
                : payment.results?.length
                  ? <Marquee duration={10000} pauseOnHover={true} >
                    <ListItem label={"Total"} value={payment.results[0].total} textType={"primary"} className="mr-3" />
                    <ListItem label={"Date"} value={payment.results[0].date} textType={"warning"} className="mr-3" />
                    <ListItem label={"Type"} value={payment.results[0].is_prepayment ? "Prepayment" : "Installment"} textType={payment.results[0].is_prepayment ? "success" : "warning"} className="mr-3" />
                    <ListItem label={"Principal"} value={payment.results[0].principal} textType={"success"} className="mr-3" />
                    <ListItem label={"Interest"} value={payment.results[0].interest} textType={"danger"} className="mr-3" />
                    <ListItem label={"Saved"} value={payment.results[0].saved} textType={parseFloat(payment.results[0].saved) && "success"} className="mr-3" />
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Prepayment calculator
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
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Payments
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getCreditPayments(token))}>
                <i className="mdi mdi-refresh" />
              </button>
              <div className="mb-0 text-muted">
                <small>Total: {payment.count}</small>
                {
                  payment.count !== barChartPrincipal?.length && <>
                    <br />
                    <small>Filtered: {barChartPrincipal?.length}</small>
                  </>
                }
              </div>
            </h4>
            <div className="form-check">
              <label htmlFor="" className="form-check-label">
                <input className="checkbox" type="checkbox"
                  checked={excludePrepayments}
                  onChange={onExcludePrepaymentsChange}
                  />Exclude prepayments <i className="input-helper"/>
              </label>
            </div>
            {
              payment.loading
                ? <Circles />
                : payment.results ? <Bar data={paymentsData} options={paymentsOptions} height={100}/> : "-"
            }
            </div>
          </div>
      </div>
      <div className="col-sm-12 col-md-6 col-lg-6 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Paid: {paidTotal} {credit?.currency}
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getCreditPayments(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h4>
            {
              payment.loading
                ? <Circles />
                : payment.results ? <Doughnut data={paidData} options={doughnutPieOptions} /> : "-"
            }
          </div>
        </div>
      </div>
      <div className="col-sm-12 col-md-6 col-lg-6 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Remaining: {remainingTotal} {credit?.currency}</h4>
            {
              overview.loading ? <Circles /> : overview.details ? <Doughnut data={remainingData} options={doughnutPieOptions} /> : "-"
            }
          </div>
        </div>
      </div>
    </div>
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Payments
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getCreditPayments(token))}>
                <i className="mdi mdi-refresh" />
              </button>
              <div className="mb-0 text-muted">
                <small>Total: {payment.count}</small>
              </div>
            </h4>
            <div className="table-responsive">
              {overviewAlertOpen && <Alert variant="danger" dismissible onClose={() => setOverviewAlertOpen(false)}>{overview.errors}</Alert>}
              {paymentAlertOpen && !payment.selectedPayment && <Alert variant="danger" dismissible onClose={() => setPaymentAlertOpen(false)}>{payment.errors}</Alert>}

              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Total </th>
                    <th> Is Prepayment </th>
                    <th> Principal </th>
                    <th> Interest </th>
                    <th> Remaining </th>
                    <th> Saved </th>
                    <th> Actions </th>
                  </tr>
                </thead>
                <tbody>
                {
                  payment.loading
                    ? <Circles
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                    : payment.results?.length
                        ? payment.results.map((p, i) => <tr key={i}>
                          <td> {p.date} </td>
                          <td> {p.total} </td>
                          <td> <i className={`text-${p.is_prepayment ? "success": "danger"} mdi mdi-${p.is_prepayment ? 'check' : 'close' }`} /> </td>
                          <td> {p.principal} </td>
                          <td> {p.interest} </td>
                          <td> {p.remaining} </td>
                          <td> {p.saved} </td>
                          <td>
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-pencil text-secondary"
                              onClick={() => dispatch(selectPayment(p.id))}
                            />
                          </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No payments found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Timetables
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getCreditTimetables(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h4>
            <div className="table-responsive">
              {timetableAlertOpen && <Alert variant="danger" dismissible onClose={() => setTimetableAlertOpen(false)}>{timetable.errors}</Alert>}

              <table className="table">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Interest </th>
                    <th> Margin </th>
                    <th> IRCC </th>
                    <th> Months </th>
                    <th> Actions </th>
                  </tr>
                </thead>
                <tbody>
                {
                  timetable.loading
                    ? <Circles
                        visible={true}
                        width="100%"
                        ariaLabel="ball-triangle-loading"
                        wrapperStyle={{float: "right"}}
                        color='orange'
                      />
                    : timetable.results?.length
                        ? timetable.results.map((timetable, i) => <tr key={i}>
                          <td> {timetable.date} </td>
                          <td> {timetable.interest}% </td>
                          <td> {timetable.margin}% </td>
                          <td> {timetable.ircc}% </td>
                          <td> {timetable.amortization_table.length} </td>
                          <td>
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-pencil text-secondary"
                              onClick={() => dispatch(selectTimetable(timetable.id))}
                            />
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-trash-can-outline text-danger"
                              onClick={() => dispatch(FinanceApi.deleteTimetable(token, timetable.id))}
                            />
                          </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No timetables found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <TimetableEditModal />

    <Tooltip anchorSelect="#progress-bar-tip" place={"bottom-start"}>
      Total paid of the remaining total
    </Tooltip>
    <Tooltip anchorSelect="#paid-percentage" place="bottom-start">
      ~ {getPercentage(paidTotal, remainingTotal)}% of the remaining total
    </Tooltip>
    <Tooltip anchorSelect="#prepaid-percentage" place="bottom-start">
      {getPercentage(paidPrepaid, credit?.total)}% of the total credit<br />
      {getPercentage(paidPrepaid, paidTotal)}% of the paid amount
    </Tooltip>
    <Tooltip anchorSelect="#principal-percentage" place="bottom-start">
      {getPercentage(paidPrincipal, credit?.total)}% of the total credit<br />
      {getPercentage(paidPrincipal, remainingPrincipal)}% of the remaining principal<br />
      {getPercentage(paidPrincipal, paidTotal)}% of the paid amount
    </Tooltip>
    <Tooltip anchorSelect="#interest-percentage" place="bottom-start">
      { getPercentage(paidInterest, credit?.total) }% of the total credit<br />
      ~ { getPercentage(paidInterest, remainingInterest) }% of the remaining interest<br />
      { getPercentage(paidInterest, paidTotal) }% of the paid amount
    </Tooltip>
    <PaymentEditModal />

  </div>
}

export default Credit;