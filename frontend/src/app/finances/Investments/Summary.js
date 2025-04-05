import React, { useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Line } from 'react-chartjs-2';
import { Circles } from "react-loader-spinner";
import Marquee from "react-fast-marquee";
import { CategoryScale, Chart, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';

import { InvestmentsApi, PensionApi } from '../../../api/finance';
import ListItem from "../../shared/ListItem";
import Errors from "../../shared/Errors";
import { formatDate } from '../../earthquakes/Earthquakes';
import { getEvaluation, getPnl } from './Pension';

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip)

const Summary = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const state = useSelector(state => state.investments)
  const pension = useSelector(s => s.pension)

  const api = new InvestmentsApi(token)
  const pensionApi = new PensionApi(token)

  const refresh = () => {
    dispatch(api.getList())
    dispatch(pensionApi.getList())
  }

  useEffect(refresh, []);

  return <div>
    <Errors errors={state.errors}/>

    {/* Top Cards - Summary, Remaining, Paid */}
    <div className="row">
      <div className="col-lg-12 col-xl-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5 className={"mb-0"}>
              Summary
              <p className={"text-small text-muted"}>*pension not included</p>
            </h5>
            {
              state.loading
                ? <Circles />
                : state.totals
                  ? state.currencies?.map(currency =>
                    <div key={`summary-${currency}`}>
                      {
                        state.totals[currency]?.active
                          ? <ListItem
                              label={`Active`}
                              value={parseFloat(state.totals[currency].active).toFixed(2) + ` ${currency}`}
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
                        state.totals[currency]?.pnl && state.totals[currency]?.dividend
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
                    </div>)
                : null
            }
            </div>
          </div>
      </div>
      {
        ["bonds", "deposits"].map(entry => <div key={entry} className="col-lg-12 col-xl-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>{entry[0].toUpperCase() + entry.slice(1)}</h5>
            {
              state.loading
                ? <Circles />
                : <>
                  {
                    state[entry]?.currencies?.map(currency =>
                      <div key={`${entry}-${currency}`}>
                        {
                          state[entry]?.[`active_${currency}`]
                            ? <ListItem
                                label={`Active`}
                                value={parseFloat(state[entry][`active_${currency}`]).toFixed(2) + ` ${currency}`}
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
                                label={`Profit / Loss`}
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
                          state[entry]?.[`pnl_${currency}`] && state[entry]?.[`dividend_${currency}`]
                            ? <ListItem
                                label={`Profit`}
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
                      </div>
                    )
                  }
                </>
            }
          </div>
        </div>
      </div>)
      }

      {
        <div className="col-lg-12 col-xl-3 grid-margin">
          <div className="card">
            <div className="card-body">
              <h5>
                Pension
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm border-0 bg-transparent"
                  onClick={() => dispatch(pensionApi.getList())}
                >
                  <i className="mdi mdi-refresh" />
                </button>
              </h5>
              {
                pension.loading
                  ? <Circles />
                  : <>
                      <ListItem
                        label={`Active (RON)`}
                        value={
                          pension.results?.map(p => getEvaluation(p, true)).reduce((accumulator, currentValue) =>
                            accumulator + parseFloat(currentValue), 0
                          ).toFixed(2)
                        }
                        textType={"info"}
                      />
                    <ListItem
                      label={"Profit / Loss"}
                      value={
                        pension.results?.map(p => getPnl(p, true)).reduce((acc, val) => acc + parseFloat(val), 0).toFixed(2)
                      }
                      textType={'warning'}
                    />
                  </>
              }
            </div>
          </div>
        </div>
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

    {/* Line charts - Bonds, Deposits, Pensions */}
    <div className="row">
      {
        ["bonds", "deposits"].map(entity => state[entity]?.currencies?.map(currency => <div key={`${entity}-rates-${currency}`} className="col-sm-4 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">
                {entity[0].toUpperCase() + entity.slice(1)} - {currency} interest
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
                  : <Line
                      data={{
                        labels: state[entity]?.[`interest_rates_${currency}`]?.map(rate => rate.date),
                        datasets: [
                          {
                            label: entity,
                            data: state[entity]?.[`interest_rates_${currency}`].map(rate => rate.interest),
                            backgroundColor: 'rgba(255, 159, 64, 0.2)',
                            borderColor: 'rgb(76,255,0)',
                            borderWidth: 1,
                            fill: false
                          },
                        ]
                      }}
                      options={{
                        scales: {
                          y: {
                            ticks: {beginAtZero: true, precision: 0.1},
                            gridLines: {color: "rgba(204, 204, 204,0.1)"},
                          },
                          x: {gridLines: {color: "rgba(204, 204, 204,0.1)"}, stacked: true}
                        },
                        legend: {display: true},
                      }}
                  />
              }
            </div>
          </div>
        </div>)
        )

      }
      {
        pension.results?.map(p =>
          <div key={p.id} className="col-sm-12 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">
                  {p.name}
                  <button
                    type={'button'}
                    className={'btn btn-outline-success btn-sm border-0 bg-transparent'}
                    onClick={() => dispatch(pensionApi.getList())}
                  >
                    <i className={'mdi mdi-refresh'} />
                  </button>
                </h6>
                {
                  pension.loading
                    ? <Circles/>
                    : <div className={"row"}>
                        <div className={"col-lg-6"}>
                          <Line data={{
                            labels: p.contributions?.map(item => item.date).reverse(),
                            datasets: [
                              {
                                data: p.contributions?.map(item => item.amount).reverse(),
                                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                                borderColor: 'rgb(76,255,0)',
                                borderWidth: 1,
                                fill: false,
                                label: "Contribution"
                              },
                            ]
                          }} options={{
                            scales: {
                              y: {
                                ticks: {beginAtZero: true, precision: 0.1},
                                gridLines: {color: "rgba(204, 204, 204,0.1)"},
                              },
                              x: {gridLines: {color: "rgba(204, 204, 204,0.1)"}, stacked: true}
                            },
                          }}/>
                        </div>
                        <div className={"col-lg-6"}>
                          <Line data={{
                            labels: p.contributions?.map(item => item.date).reverse(),
                            datasets: [
                              {
                                data: p.contributions?.map(item => item.unit_value).reverse(),
                                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                                borderColor: 'rgb(12,57,198)',
                                borderWidth: 1,
                                fill: false,
                                label: "Value"
                              },
                            ]
                          }} options={{
                            scales: {
                              y: {
                                ticks: {beginAtZero: true, precision: 0.1},
                                gridLines: {color: "rgba(204, 204, 204,0.1)"},
                              },
                              x: {gridLines: {color: "rgba(204, 204, 204,0.1)"}, stacked: true}
                            },
                          }}/>
                        </div>
                    </div>
                }
              </div>
            </div>
          </div>
        )
      }
    </div>
  </div>
}

export default Summary;