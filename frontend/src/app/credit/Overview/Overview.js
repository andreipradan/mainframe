import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";

import CreditApi from "../../../api/credit";
import ListItem from "./components/ListItem";
import {calculateSum, getPercentage} from "../utils";
import Alert from "react-bootstrap/Alert";
import { Bar, Doughnut } from "react-chartjs-2";
import {ProgressBar} from "react-bootstrap";
import {Tooltip} from "react-tooltip";

const Credit = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const overview = useSelector(state => state.credit)
  const [overviewAlertOpen, setOverviewAlertOpen] = useState(false)
  useEffect(() => {setOverviewAlertOpen(!!overview.errors)}, [overview.errors])
  useEffect(() => {!overview.details && dispatch(CreditApi.getOverview(token))}, []);
  const credit = overview.details?.credit

  const payment = useSelector(state => state.payment)
  const [paymentAlertOpen, setPaymentAlertOpen] = useState(false)
  useEffect(() => {setPaymentAlertOpen(!!payment.errors)}, [payment.errors])
  useEffect(() => {!payment.results && dispatch(CreditApi.getPayments(token))}, []);

  const paidTotal = calculateSum(payment.results, "total")
  const paidInterest = calculateSum(payment.results, "interest")
  const paidPrincipal = calculateSum(payment.results, "principal")
  const paidPrepaid = calculateSum(payment.results, "total", "is_prepayment")

  const saved = calculateSum(payment.results, "saved")

  const latestTimetable = overview.details?.latest_timetable.amortization_table
  const remainingInterest = calculateSum(latestTimetable, "interest")
  const remainingInsurance = calculateSum(latestTimetable, "insurance")
  const remainingPrincipal = parseFloat(-payment.results?.[0].remaining)
  const remainingTotal = (remainingPrincipal + remainingInterest + remainingInsurance).toFixed(2)


  const paidData = {
    datasets: [{
      data: [paidInterest, paidPrincipal, paidPrepaid],
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
    labels: ['Interest', 'Principal', 'Prepaid']
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
        labels: payment.results?.map(p => p.date).reverse(),
        datasets: [{
          label: 'Ron',
          data: payment.results?.map(p => p.total).reverse(),
          backgroundColor: context => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(243,16,65,0.2)');
            gradient.addColorStop(0.5, 'rgb(255,210,64, 0.2)');
            gradient.addColorStop(1, 'rgba(75,192,126,0.2)');
            return gradient;
          },
          borderColor: context => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, context.height || 100);
            gradient.addColorStop(0, 'rgba(243,16,65,1)');
            gradient.addColorStop(0.5, 'rgb(255,210,64, 1)');
            gradient.addColorStop(1, 'rgb(75,192,126)');
            return gradient;
          },
          borderWidth: 1,
          fill: false
        }]
    };

  const paymentsOptions = {
    scales: {
      yAxes: [{
        ticks: {beginAtZero: true},
        gridLines: {color: "rgba(204, 204, 204,0.1)"}
      }],
      xAxes: [{gridLines: {color: "rgba(204, 204, 204,0.1)"}}]
    },
    legend: {display: false},
    elements: {point: {radius: 0}},
    }

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Overview
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(CreditApi.getOverview(token))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
        <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Credit</a></li>
        <li className="breadcrumb-item active" aria-current="page">Overview</li>
        </ol>
      </nav>
    </div>
    {overviewAlertOpen && <Alert variant="danger" dismissible onClose={() => setOverviewAlertOpen(false)}>{overview.errors}</Alert>}
    {paymentAlertOpen && <Alert variant="danger" dismissible onClose={() => setPaymentAlertOpen(false)}>{payment.errors}</Alert>}

    <div className="row">
      <div className="col-sm-12 col-md-4 col-lg-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              Summary
            </h5>
            {
              overview.loading
                ? <Circles
                    visible={true}
                    height="15"
                    ariaLabel="ball-triangle-loading"
                    wrapperStyle={{float: "right"}}
                    color='orange'
                  />
                : credit
                  ? <>
                    <ListItem label={"Credit"} value={credit.total} textType={"primary"}/>
                    <ListItem label={"Date"} value={credit.date.toLocaleString()} textType={"warning"}/>
                    <ListItem label={"Months"} value={`${credit.number_of_months} (${credit.number_of_months / 12} yrs)`} />
                    <ListItem label={"Saved"} value={saved} textType={"success"}/>
                  </>
                  : "-"
            }
            </div>
          </div>
      </div>
      <div className="col-sm-12 col-md-4 col-lg-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Estimated total</h5>
            {
              overview.loading
                ? <Circles
                    visible={true}
                    height="15"
                    ariaLabel="ball-triangle-loading"
                    wrapperStyle={{float: "right"}}
                    color='orange'
                  />
                : overview.details
                  ? <>
                    <ListItem label={"Total"} value={(paidTotal + parseFloat(remainingTotal)).toFixed(2)} textType={"primary"}/>
                    <ListItem label={"Date"} value={latestTimetable[latestTimetable.length - 1]?.date} textType={"warning"} />
                    <ListItem label={"Months"} value={`${latestTimetable.length} (${(latestTimetable.length / 12).toFixed(1)} yrs)`} />
                    <ListItem label={"Interest"} value={(paidInterest + remainingInterest).toFixed(2)} textType={"danger"}/>
                  </>
                  : "-"
            }
          </div>
        </div>
      </div>
      <div className="col-sm-12 col-md-4 col-lg-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Last Payment</h5>
            {
              overview.loading
                ? <Circles
                    visible={true}
                    height="15"
                    ariaLabel="ball-triangle-loading"
                    wrapperStyle={{float: "right"}}
                    color='orange'
                  />
                : payment.results
                  ? <>
                    <ListItem label={"Total"} value={payment.results[0].total} textType={"primary"}/>
                    <ListItem label={"Date"} value={payment.results[0].date} textType={"warning"}/>
                    <ListItem label={"Principal"} value={payment.results[0].principal} textType={"success"}/>
                    {
                      payment.results[0].is_prepayment
                        ? <ListItem label={"Saved"} value={payment.results[0].saved} textType={"success"}/>
                        : <ListItem label={"Interest"} value={payment.results[0].interest} textType={"danger"}/>
                    }
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
              overview.loading || !credit
                ? <Circles
                    visible={true}
                    height="15"
                    ariaLabel="ball-triangle-loading"
                    color='orange'
                  />
                : <>
                <ProgressBar now={paidPrincipal} max={credit.total}/>
                </>
            }
            </div>
          </div>
      </div>
      <div className="col-sm-12 col-md-6 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Paid: {paidTotal} {credit?.currency}</h4>
          </div>
          <Doughnut data={paidData} options={doughnutPieOptions} />
        </div>
      </div>
      <div className="col-sm-12 col-md-6 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Remaining: {remainingTotal} {credit?.currency}</h4>
          </div>
          <Doughnut data={remainingData} options={doughnutPieOptions} />
        </div>
      </div>
      <div className="col-sm-12 col-md-12 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Payments</h4>
              {
                overview.loading
                  ? <Circles
                      visible={true}
                      height="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                  : <Bar height={100} data={paymentsData} options={paymentsOptions} />
              }
            </div>
          </div>
      </div>
    </div>
    <Tooltip anchorSelect="#progress-bar-tip" place={"bottom-start"}>
      Total paid / remaining total<br/>
      <br />
      Paid: <span className="text-primary">{paidTotal}</span><br />
      &nbsp;&nbsp;Principal: <span className="text-success">{paidPrincipal}</span><br/>
      &nbsp;&nbsp;Interest: <span className="text-danger">{paidInterest}</span><br/>
      <br/>
      Remaining: <span className="text-primary">{remainingTotal}</span><br />
      &nbsp;&nbsp;Principal: <span className="text-success">{remainingPrincipal}</span><br/>
      &nbsp;&nbsp;Interest: <span className="text-danger">{remainingInterest} ~ </span><br/>
      &nbsp;&nbsp;Insurance: <span className="text-danger">{remainingInsurance}</span><br/>
    </Tooltip>
  </div>
}

export default Credit;