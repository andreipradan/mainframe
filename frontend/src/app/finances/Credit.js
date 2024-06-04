import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Bar, Doughnut } from "react-chartjs-2";
import { Circles } from "react-loader-spinner";
import { ProgressBar } from "react-bootstrap";
import { Tooltip } from "react-tooltip";
import Marquee from "react-fast-marquee";
import Select from "react-select";
import "nouislider/distribute/nouislider.css";

import { FinanceApi } from "../../api/finance";
import { calculateSum, getPercentage } from "./utils";
import { selectStyles } from "./Categorize/EditModal";
import ListItem from "../shared/ListItem";
import Errors from "../shared/Errors";

const Credit = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const overview = useSelector(state => state.credit)
  useEffect(() => {
    if (!overview.credit) dispatch(FinanceApi.getCredit(token))
    else onChangeCurrency()
    }, [overview.credit]
  );
  const credit = overview.credit
  const rates = overview.rates
  const latestTimetable = overview.latest_timetable?.amortization_table

  const payment = useSelector(state => state.payment)
  useEffect(() => {!payment.results && dispatch(FinanceApi.getCreditPayments(token))}, []);

  const saved = overview.payment_stats?.saved

  const [excludePrepayments, setExcludePrepayments] = useState(false)
  const [barChartPrincipal, setBarChartPrincipal] = useState(null)
  const [barChartInterest, setBarChartInterest] = useState(null)
  const [barChartLabels, setBarChartLabels] = useState(null)

  useEffect(() => setBarChartPrincipal(payment.results?.map(p => p.principal).reverse()), [payment.results])
  useEffect(() => setBarChartInterest(payment.results?.map(p => p.interest).reverse()), [payment.results])
  useEffect(() => setBarChartLabels(payment.results?.map(p => p.date).reverse()), [payment.results])

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
          return `Total: ${(currentValue + otherValue).toFixed(2)}`
        }
      }
    }
  }

  const onExcludePrepaymentsChange = () => {
    if (!excludePrepayments) {
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

  const [selectedCurrency, setSelectedCurrency] = useState(null)
  const [summaryCredit, setSummaryCredit] = useState(null)
  const [summarySaved, setSummarySaved] = useState(null)
  const [summaryTotal, setSummaryTotal] = useState(null)
  const [summaryInterest, setSummaryInterest] = useState(null)

  const [remainingInterest, setRemainingInterest] = useState(null)
  const [remainingInsurance, setRemainingInsurance] = useState(null)
  const [remainingPrincipal, setRemainingPrincipal] = useState(null)
  const [remainingTotal, setRemainingTotal] = useState(null)

  const [paidTotal, setPaidTotal] = useState(null)
  const [paidPrepaid, setPaidPrepaid] = useState(null)
  const [paidPrincipal, setPaidPrincipal] = useState(null)
  const [paidInterest, setPaidInterest] = useState(null)

  const getAmountInCurrency = (amount, currency = selectedCurrency) => {
    if (!rates?.length) return amount
    const rate = currency
      ? currency.label === credit.currency
        ? 1
        : rates.find(r => r.symbol === currency.value).value
      : 1
    return parseFloat(amount / rate).toFixed(2)
  }
  const onChangeCurrency = newValue => {
    const currency = !newValue
      ? {
          label: credit?.currency,
          value: `${credit.currency}${credit.currency}`
        }
      : newValue

    const totalPaid = parseFloat(overview.payment_stats?.total)
    const interestPaid = parseFloat(overview.payment_stats?.interest)

    const principalRemaining = calculateSum(latestTimetable, "principal")
    const interestRemaining = calculateSum(latestTimetable, "interest")
    const insuranceRemaining = calculateSum(latestTimetable, "insurance")
    const totalRemaining = principalRemaining + interestRemaining + insuranceRemaining

    setSelectedCurrency(currency)
    setSummaryCredit(getAmountInCurrency(credit.total, currency))
    setSummarySaved(getAmountInCurrency(saved, currency))
    setSummaryTotal(getAmountInCurrency(totalPaid + totalRemaining, currency))
    setSummaryInterest(getAmountInCurrency(interestPaid + interestRemaining, currency))

    setRemainingInterest(getAmountInCurrency(interestRemaining, currency))
    setRemainingPrincipal(getAmountInCurrency(principalRemaining, currency))
    setRemainingInsurance(getAmountInCurrency(insuranceRemaining, currency))
    setRemainingTotal(getAmountInCurrency(totalRemaining, currency))

    setPaidTotal(getAmountInCurrency(totalPaid, currency))
    setPaidInterest(getAmountInCurrency(interestPaid, currency))
    setPaidPrepaid(getAmountInCurrency(overview.payment_stats?.prepaid, currency))
    setPaidPrincipal(getAmountInCurrency(overview.payment_stats?.principal, currency))

    setBarChartPrincipal(barChartPrincipal?.map(p => getAmountInCurrency(p, currency)))
    setBarChartInterest(barChartInterest?.map(p => getAmountInCurrency(p, currency)))
  }
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
  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Credit
        <button
          type="button"
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
    <div className="page-header">
      <h6 className="page-title">
        {
          rates?.length && selectedCurrency?.label && selectedCurrency.label !== credit?.currency
            ? <small className="text-warning">
                Rate:
                1 {selectedCurrency.label} = {rates.find(r => r.symbol === selectedCurrency.value)?.value} {credit?.currency}<br/>
                From: {rates.find(r => r.symbol === selectedCurrency.value)?.date}<br/>
                Source: {rates.find(r => r.symbol === selectedCurrency.value)?.source}
              </small>
            : null
        }
      </h6>
      {
        rates?.length
          ? <Select
            placeholder={"Currency"}
            value={{label: selectedCurrency?.label || "Currency", value: selectedCurrency?.value || "Currency"}}
            onChange={onChangeCurrency}
            options={
              [
                {label: credit?.currency, value: credit?.currency},
                {label: "EUR", value: rates.find(r => r.symbol.replace(credit?.currency, "") === "EUR").symbol},
                {label: "USD", value: rates.find(r => r.symbol.replace(credit?.currency, "") === "USD").symbol},
                ...rates.map(c =>
                    ({label: c.symbol.replace(credit?.currency, ""), value: c.symbol})
                ).filter(r => !["RON", "EUR", "USD"].includes(r.label))
              ]
            }
            styles={selectStyles}
            isClearable={true}
            closeMenuOnSelect={true}
          />
        : null
      }
    </div>
    <Errors errors={overview.errors}/>
    <Errors errors={payment.errors}/>

    {/* Top Cards - Summary, Remaining, Paid */}
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
                    <ListItem label={"Credit"} value={summaryCredit} textType={"primary"}/>
                    <ListItem label={"Date"} value={credit.date} textType={"warning"}/>
                    <ListItem label={"Months"} value={`${credit.number_of_months} (${credit.number_of_months / 12} yrs)`} />
                    <ListItem label={"Saved"} value={summarySaved} textType={"success"}/>
                    <ListItem label={"~Total"} value={summaryTotal} textType={"warning"}/>
                    <ListItem label={"~Interest"} value={summaryInterest} textType={"danger"}/>
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
                : overview.credit
                  ? <>
                    <ListItem label={"Total"} value={remainingTotal} textType={"primary"}/>
                    <ListItem
                        label={"Last day"}
                        value={latestTimetable[latestTimetable.length - 1]?.date}
                        textType={"warning"}
                    />
                    <ListItem
                        label={"Months"}
                        value={`${latestTimetable.length} (${(latestTimetable.length / 12).toFixed(1)} yrs)`}
                    />
                    <ListItem label={"Insurance"} value={remainingInsurance}/>
                    <ListItem label={"Principal"} value={remainingPrincipal} textType={"success"}/>
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
              <button
                type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(FinanceApi.getCreditPayments(token))}
              >
                <i className="mdi mdi-refresh"/>
              </button>
            </h5>
            {
              payment.loading
                ? <Circles />
                : payment.results?.length
                  ? <>
                    <ListItem label={"Total"} value={paidTotal} textType={"primary"} tooltip="paid-percentage" />
                    <ListItem label={"Date"} value={new Date().toISOString().split("T")[0]} textType={"warning"} />
                    <ListItem label={"Payments"} value={payment.count} />
                    <ListItem label={"Prepaid"} value={paidPrepaid} textType={"success"} tooltip="prepaid-percentage" />
                    <ListItem label={"Principal"} value={paidPrincipal} textType={"success"} tooltip={"principal-percentage"} />
                    <ListItem label={"Interest"} value={paidInterest} textType={"danger"} tooltip={"interest-percentage"} />
                  </>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Marquee - Next payment */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Next payment <sup><small>{selectedCurrency?.label ? `(${selectedCurrency?.label})` : null}</small></sup>{
              overview.loading
                  ? null
                  : latestTimetable?.length
                      ? <span className="text-warning"> {latestTimetable[0].date}</span>
                      : null
            }</h6>
            {
              overview.loading
                  ? <Circles/>
                  : latestTimetable?.length
                      ? <Marquee pauseOnHover={true}>
                        <ListItem label={"Total"} value={getAmountInCurrency(latestTimetable[0].total)} textType={"primary"} className="mr-3"/>
                        <ListItem label={"Principal"} value={getAmountInCurrency(latestTimetable[0].principal)} textType={"success"} className="mr-3"/>
                        <ListItem
                            label={"Interest"}
                            value={
                              `${getAmountInCurrency(latestTimetable[0].interest)} (${overview.latest_timetable.interest}%)`
                            }
                            textType={"danger"}
                            className="mr-3"
                        />
                        <ListItem label={"IRCC"} value={`${getAmountInCurrency(overview.latest_timetable.ircc)}%`} textType={"danger"} className="mr-3"/>
                        <ListItem label={"Insurance"} value={getAmountInCurrency(latestTimetable[0].insurance)} textType={"danger"} className="mr-3"/>
                        <ListItem label={"Remaining"} value={getAmountInCurrency(latestTimetable[0].remaining)} textType={"danger"} className="mr-3"/>
                      </Marquee>
                      : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Progress */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              Progress: {getPercentage(paidPrincipal, summaryCredit)}%
              &nbsp;<i id="progress-bar-tip" className="mdi mdi-information-outline"/>
            </h5>
            {
              overview.loading || payment.loading
                ? <Circles />
                : credit
                  ? <ProgressBar
                      now={paidPrincipal | 0}
                      max={summaryCredit | 0}
                      label={`${paidPrincipal} / ${summaryCredit}`}
                    />
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Marquee - Last payment */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Last Payment <sup><small>{selectedCurrency?.label ? `(${selectedCurrency?.label})` : null}</small></sup></h6>
            {
              payment.loading
                  ? <Circles/>
                  : payment.results?.length
                  ? <Marquee duration={10000} pauseOnHover={true} >
                    <ListItem label={"Total"} value={getAmountInCurrency(payment.results[0].total)} textType={"primary"} className="mr-3" />
                    <ListItem label={"Date"} value={payment.results[0].date} textType={"warning"} className="mr-3" />
                    <ListItem label={"Type"} value={payment.results[0].is_prepayment ? "Prepayment" : "Installment"} textType={payment.results[0].is_prepayment ? "success" : "warning"} className="mr-3" />
                    <ListItem label={"Principal"} value={getAmountInCurrency(payment.results[0].principal)} textType={"success"} className="mr-3" />
                    {payment.results[0].interest > 0 && <ListItem label={"Interest"} value={getAmountInCurrency(payment.results[0].interest)} textType={"danger"} className="mr-3" />}
                    <ListItem label={"Saved"} value={getAmountInCurrency(payment.results[0].saved)} textType={parseFloat(payment.results[0].saved) && "success"} className="mr-3" />
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Bar chart - Payments */}
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">
              Payments <sup><small>{selectedCurrency?.label ? `(${selectedCurrency?.label})` : null}</small></sup>
              <button
                  type="button"
                  className="btn btn-outline-success btn-sm border-0 bg-transparent"
                  onClick={() => dispatch(FinanceApi.getCreditPayments(token))}
              >
                <i className="mdi mdi-refresh"/>
              </button>
              <div className="mb-0 text-muted">
                <small>Total: {payment.count}</small>
                {
                    payment.count !== barChartPrincipal?.length && <>
                      <br/>
                      <small>Filtered: {barChartPrincipal?.length}</small>
                    </>
                }
              </div>
            </h6>
            <div className="form-check" onClick={onExcludePrepaymentsChange}>
            <label htmlFor="" className="form-check-label">
                <input
                    className="checkbox"
                    type="checkbox"
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
    </div>

    {/* Pie charts - paid, remaining */}
    <div className="row">
      <div className="col-sm-12 col-md-6 col-lg-6 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">
              Paid: {paidTotal}
              <sup><small>{selectedCurrency?.label ? `(${selectedCurrency?.label})` : null}</small></sup>
              <button
                  type="button"
                  className="btn btn-outline-success btn-sm border-0 bg-transparent"
                  onClick={() => dispatch(FinanceApi.getCreditPayments(token))}
              >
                <i className="mdi mdi-refresh"/>
              </button>
            </h6>
            {
              payment.loading
                  ? <Circles/>
                  : payment.results ? <Doughnut data={paidData} options={doughnutPieOptions} /> : "-"
            }
          </div>
        </div>
      </div>
      <div className="col-sm-12 col-md-6 col-lg-6 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">Remaining: {remainingTotal}
              <sup><small>{selectedCurrency?.label ? `(${selectedCurrency?.label})` : null}</small></sup>
            </h6>
            {
              overview.loading
                  ? <Circles/>
                  : overview.credit
                  ? <Doughnut data={remainingData} options={doughnutPieOptions}/>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>

    <Tooltip anchorSelect="#progress-bar-tip" place={"bottom-start"}>
      Paid principal related to the total of the borrowed amount
    </Tooltip>
    <Tooltip anchorSelect="#paid-percentage" place="bottom-start">
      {getPercentage(paidTotal, summaryCredit)}% of the total credit<br/>
      ~ {getPercentage(paidTotal, remainingTotal)}% of the remaining total
    </Tooltip>
    <Tooltip anchorSelect="#prepaid-percentage" place="bottom-start">
      {getPercentage(paidPrepaid, summaryCredit)}% of the total credit<br/>
      {getPercentage(paidPrepaid, paidTotal)}% of the paid amount
    </Tooltip>
    <Tooltip anchorSelect="#principal-percentage" place="bottom-start">
      {getPercentage(paidPrincipal, summaryCredit)}% of the total credit<br/>
      {getPercentage(paidPrincipal, remainingPrincipal)}% of the remaining principal<br/>
      {getPercentage(paidPrincipal, paidTotal)}% of the paid amount
    </Tooltip>
    <Tooltip anchorSelect="#interest-percentage" place="bottom-start">
      {getPercentage(paidInterest, summaryCredit)}% of the total credit<br />
      ~ {getPercentage(paidInterest, remainingInterest)}% of the remaining interest<br/>
      {getPercentage(paidInterest, paidTotal)}% of the paid amount
    </Tooltip>

  </div>
}

export default Credit;