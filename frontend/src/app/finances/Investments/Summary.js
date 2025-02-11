import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Line } from 'react-chartjs-2';
import { Circles } from "react-loader-spinner";
import Marquee from "react-fast-marquee";

import { InvestmentsApi } from '../../../api/finance';
import ListItem from "../../shared/ListItem";
import Errors from "../../shared/Errors";
import { formatDate } from '../../earthquakes/Earthquakes';

const Summary = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const state = useSelector(state => state.investments)

  const api = new InvestmentsApi(token)

  const [lineChartBonds, setLineChartBonds] = useState(null)
  const [lineChartDeposits, setLineChartDeposits] = useState(null)
  const [lineChartBondsLabels, setLineChartBondsLabels] = useState(null)
  const [lineChartDepositsLabels, setLineChartDepositsLabels] = useState(null)

  useEffect(() => {
    setLineChartBonds(state.bonds?.interest_rates?.map(p => p.interest));
    setLineChartDeposits(state.deposits?.interest_rates?.map(p => p.interest))
    setLineChartBondsLabels(state.bonds?.interest_rates?.map(p => p.date__date))
    setLineChartDepositsLabels(state.deposits?.interest_rates?.map(p => p.date))

  }, [state.bonds])

  const bondsInterestData = {
    labels: lineChartBondsLabels,
    datasets: [
      {
        label: 'Bonds',
        data: lineChartBonds,
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        borderColor: 'rgb(76,255,0)',
        borderWidth: 1,
        fill: false
      },
    ]
  };
  const depositsInterestData = {
    labels: lineChartDepositsLabels,
    datasets: [
      {
        label: 'Deposits',
        data: lineChartDeposits,
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        borderColor: 'rgb(0,60,255)',
        borderWidth: 1,
        fill: false
      },
    ]
  };

  useEffect(() => {
    dispatch(api.getList())
  }, []);

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Investments
        <button
          type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(api.getList())}
        >
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item active" aria-current="page">Investments</li>
        </ol>
      </nav>
    </div>
    <Errors errors={state.errors}/>

    {/* Top Cards - Summary, Remaining, Paid */}
    <div className="row">
      <div className="col-sm-12 col-lg-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Summary</h5>
            {
              state.loading
                ? <Circles />
                : state.totals
                  ? state.currencies?.map(currency =>
                    <>
                      {
                        state.totals[currency]?.active
                          ? <ListItem
                              label={"Active"}
                              value={`${parseFloat(state.totals[currency].active).toFixed(2)} ${currency}`}
                              textType={"primary"}
                          />
                          : null
                      }
                      {
                        state.totals[currency]?.pnl && parseFloat(state.totals[currency].pnl)
                          ? <ListItem
                              label={"Profit / Loss"}
                              value={`${parseFloat(state.totals[currency].pnl).toFixed(2)} ${currency}`}
                              textType={'warning'}
                          />
                          : null
                      }
                      {
                        state.totals[currency]?.dividend
                          ? <ListItem
                              label={"Dividends"}
                              value={`${parseFloat(state.totals[currency].dividend).toFixed(2)} ${currency}`}
                              textType={parseFloat(state.totals[currency].dividend) < 0 ? 'danger' : 'success'}
                          />
                          : null
                      }
                      {
                        state.totals[currency]?.pnl
                          ? <ListItem
                              label={"Profit"}
                              value={
                                parseFloat(state.totals[currency]?.dividend)
                                  ? `${(parseFloat(state.totals[currency].pnl) + parseFloat(state.totals[currency].dividend)).toFixed(2)} ${currency}`
                                  : `${parseFloat(state.totals[currency].pnl).toFixed(2)} ${currency}`
                                }
                              textType={parseFloat(state.totals[currency].dividend) < 0 ? 'danger' : 'success'}
                          />
                          : null
                      }
                    </>)
                : null
            }
            </div>
          </div>
      </div>
      {
        ["bonds", "deposits", "pension"].map(entry => <div className="col-sm-12 col-lg-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>{entry[0].toUpperCase() + entry.slice(1)}</h5>
            {
              state.loading
                ? <Circles />
                : <>
                  {
                    state[entry]?.currencies?.map(currency =>
                      <>
                        {
                          state[entry]?.[`active_${currency}`]
                            ? <ListItem
                                label={"Active"}
                                value={`${parseFloat(state[entry][`active_${currency}`]).toFixed(2)} ${currency}`}
                                textType={"info"}
                              />
                            : null
                        }
                        {
                          state[entry]?.[`deposit_${currency}`]
                            ? <ListItem
                                label={"Deposits"}
                                value={`${state[entry][`deposit_${currency}`]} ${currency}`}
                                textType={"warning"}
                              />
                            : null
                        }
                        {
                          state[entry]?.[`buy_${currency}`]
                            ? <ListItem
                                label={"Bought"}
                                value={`${state[entry][`buy_${currency}`]} ${currency}`}
                                textType={"muted"}
                              />
                            : null
                        }
                        {
                          state[entry]?.[`sell_${currency}`]
                            ? <ListItem
                                label={"Sold"}
                                value={`${state[entry][`sell_${currency}`]} ${currency}`}
                                textType={"muted"}
                              />
                            : null
                        }
                        {
                          state[entry]?.[`pnl_${currency}`]
                            ? <ListItem
                                label={"Profit / Loss"}
                                value={`${state[entry][`pnl_${currency}`]} ${currency}`}
                                textType={'warning'}
                              />
                            : null
                        }
                        {
                          state[entry]?.[`dividend_${currency}`]
                            ? <ListItem
                                label={"Dividends"}
                                value={`${state[entry][`dividend_${currency}`]} ${currency}`}
                                textType={state[entry]?.[`dividend_${currency}`] > 0 ? "success" : "danger"}
                              />
                            : null
                        }
                        {
                          state[entry]?.[`pnl_${currency}`]
                            ? <ListItem
                                label={"Profit"}
                                value={
                                  state[entry][`pnl_${currency}`]
                                    ? state[entry]?.[`dividend_${currency}`]
                                      ? `${parseFloat(state[entry][`pnl_${currency}`]) + parseFloat(state[entry][`dividend_${currency}`])} ${currency}`
                                      : `${state[entry]?.[`pnl_${currency}`]} ${currency}`
                                    : '-'
                                }
                                textType={"success"}
                              />
                            : null
                        }
                        <hr className="mt-0 mb-0"/>
                      </>
                    )
                  }
                </>
            }
          </div>
        </div>
      </div>)
      }

    </div>

    {/* Marquee - Next bond maturity */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Next bond maturity</h6>
            {
              state.loading
                  ? <Circles/>
                  : state.bonds?.next_maturity
                      ? <Marquee pauseOnHover>
                        <ListItem label={"Date"} value={formatDate(new Date(state.bonds.next_maturity.maturity))} textType={"warning"} className="mr-3"/>
                        <ListItem label={"Ticker"} value={state.bonds.next_maturity.ticker} textType={"primary"} className="mr-3"/>
                        <ListItem label={"Amount"} value={`${state.bonds.next_maturity.net} ${state.bonds.next_maturity.currency}`} textType={"success"} className="mr-3"/>
                        <ListItem
                          label={"Interest"}
                          value={
                            `${
                              parseFloat(
                                state.bonds.next_maturity.interest
                                / 100
                                * -state.bonds.next_maturity.net
                                / 12
                                * state.bonds.next_maturity.months
                              ).toFixed(2)
                            } ${state.bonds.next_maturity.currency} (${state.bonds.next_maturity.interest}%)`} textType={"success"} className="mr-3"/>
                      </Marquee>
                      : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Marquee - Next deposit maturity */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Next deposit maturity</h6>
            {
              state.loading
                  ? <Circles/>
                  : state.deposits?.next_maturity
                      ? <Marquee pauseOnHover>
                        <ListItem label={"Date"} value={formatDate(new Date(state.deposits.next_maturity.maturity))} textType={"warning"} className="mr-3"/>
                        <ListItem label={"Name"} value={state.deposits.next_maturity.name} textType={"primary"} className="mr-3"/>
                        <ListItem label={"Amount"} value={`${state.deposits.next_maturity.amount} ${state.deposits.next_maturity.currency}`} textType={"warning"} className="mr-3"/>
                        <ListItem
                          label={"Interest"}
                          value={
                            `${
                              parseFloat(
                                state.deposits.next_maturity.interest
                                / 100
                                * state.deposits.next_maturity.amount
                                / 12
                                * state.deposits.next_maturity.months).toFixed(2)} ${state.deposits.next_maturity.currency} (${state.deposits.next_maturity.interest}%)`}
                          textType={"success"}
                          className="mr-3"
                        />
                      </Marquee>
                      : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Line chart - Interest rate */}
    <div className="row">
      <div className="col-sm-6 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">
              Bonds interest rates
              <button
                type={'button'}
                className={'btn btn-outline-success btn-sm border-0 bg-transparent'}
                onClick={() => dispatch(api.getList())}
              >
                <i className={'mdi mdi-refresh'} />
              </button>
            </h6>
            {
              state.loading
                ? <Circles/>
                : <Line data={bondsInterestData} options={{
                    scales: {
                      yAxes: [{
                        ticks: {beginAtZero: true, precision: 0.1},
                        gridLines: {color: "rgba(204, 204, 204,0.1)"},
                      }],
                      xAxes: [{gridLines: {color: "rgba(204, 204, 204,0.1)"}, stacked: true}]
                    },
                    legend: {display: false},
                  }}/>
            }
          </div>
        </div>
      </div>
      <div className="col-sm-6 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">
              Deposit interest rates
              <button
                type={'button'}
                className={'btn btn-outline-success btn-sm border-0 bg-transparent'}
                onClick={() => dispatch(api.getList())}
              >
                <i className={'mdi mdi-refresh'} />
              </button>
            </h6>
            {
              state.loading
                ? <Circles/>
                : <Line data={depositsInterestData} options={{
                    scales: {
                      yAxes: [{
                        ticks: {beginAtZero: true, precision: 0.1},
                        gridLines: {color: "rgba(204, 204, 204,0.1)"},
                      }],
                      xAxes: [{gridLines: {color: "rgba(204, 204, 204,0.1)"}, stacked: true}]
                    },
                    legend: {display: false},
                  }}/>
            }
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Summary;