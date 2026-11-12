import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Line } from 'react-chartjs-2';
import { Circles } from 'react-loader-spinner';
import Marquee from 'react-fast-marquee';
import {
  CategoryScale,
  Chart,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

import { InvestmentsApi, PensionApi } from '../../../api/finance';
import ListItem from '../../shared/ListItem';
import Errors from '../../shared/Errors';
import { formatDate } from '../../earthquakes/Earthquakes';
import { getEvaluation, getPnl } from './Pension';

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip);

/** Combines profit/loss and dividends into a display value. */
const getProfitValue = (pnl, dividend, currency) => {
  if (!pnl) return '-';

  const profit = dividend
    ? Number.parseFloat(pnl) + Number.parseFloat(dividend)
    : pnl;
  return `${profit} ${currency}`;
};

const Summary = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const investments = useSelector((state) => state.investments);
  const pension = useSelector((s) => s.pension);

  const api = new InvestmentsApi(token);
  const pensionApi = new PensionApi(token);

  const refresh = () => {
    dispatch(api.getList());
    dispatch(pensionApi.getList());
  };

  useEffect(refresh, []);

  return (
    <div>
      <Errors errors={investments.errors} />

      {/* Top Cards - Summary, Remaining, Paid */}
      <div className='row'>
        <div className='col-lg-12 col-xl-3 grid-margin'>
          <div className='card'>
            <div className='card-body'>
              <h5 className={'mb-0'}>
                Summary
                <p className={'text-small text-muted'}>*pension not included</p>
              </h5>
              {investments.loading && <Circles />}
              {!investments.loading &&
                investments.totals &&
                investments.currencies?.map((currency) => (
                  <div key={`summary-${currency}`}>
                    {investments.totals[currency]?.active ? (
                      <ListItem
                        label={'Active'}
                        value={`${Number.parseFloat(investments.totals[currency].active).toFixed(2)} ${currency}`}
                        textType={'primary'}
                      />
                    ) : null}
                    {investments.totals[currency]?.pnl &&
                    Number.parseFloat(investments.totals[currency].pnl) ? (
                      <ListItem
                        label={'Profit / Loss'}
                        value={`${Number.parseFloat(investments.totals[currency].pnl).toFixed(2)} ${currency}`}
                        textType={'warning'}
                      />
                    ) : null}
                    {investments.totals[currency]?.dividend ? (
                      <ListItem
                        label={'Dividends'}
                        value={`${Number.parseFloat(investments.totals[currency].dividend).toFixed(2)} ${currency}`}
                        textType={
                          Number.parseFloat(
                            investments.totals[currency].dividend
                          ) < 0
                            ? 'danger'
                            : 'success'
                        }
                      />
                    ) : null}
                    {investments.totals[currency]?.pnl &&
                    investments.totals[currency]?.dividend ? (
                      <ListItem
                        label={'Profit'}
                        value={
                          Number.parseFloat(
                            investments.totals[currency]?.dividend
                          )
                            ? `${(Number.parseFloat(investments.totals[currency].pnl) + Number.parseFloat(investments.totals[currency].dividend)).toFixed(2)} ${currency}`
                            : `${Number.parseFloat(investments.totals[currency].pnl).toFixed(2)} ${currency}`
                        }
                        textType={
                          Number.parseFloat(
                            investments.totals[currency].dividend
                          ) < 0
                            ? 'danger'
                            : 'success'
                        }
                      />
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        </div>
        {['bonds', 'deposits'].map((entry) => (
          <div key={entry} className='col-lg-12 col-xl-3 grid-margin'>
            <div className='card'>
              <div className='card-body'>
                <h5>{entry[0].toUpperCase() + entry.slice(1)}</h5>
                {investments.loading ? (
                  <Circles />
                ) : (
                  investments[entry]?.currencies?.map((currency) => {
                    const active = investments[entry]?.[`active_${currency}`];
                    const deposit = investments[entry]?.[`deposit_${currency}`];
                    const buy = investments[entry]?.[`buy_${currency}`];
                    const sell = investments[entry]?.[`sell_${currency}`];
                    const pnl = investments[entry]?.[`pnl_${currency}`];
                    const dividend =
                      investments[entry]?.[`dividend_${currency}`];
                    return (
                      <div key={`${entry}-${currency}`}>
                        {active ? (
                          <ListItem
                            label={'Active'}
                            value={`${Number.parseFloat(active).toFixed(2)} ${currency}`}
                            textType={'info'}
                          />
                        ) : null}
                        {deposit ? (
                          <ListItem
                            label={'Deposits'}
                            value={`${deposit} ${currency}`}
                            textType={'warning'}
                          />
                        ) : null}
                        {buy ? (
                          <ListItem
                            label={'Bought'}
                            value={`${buy} ${currency}`}
                            textType={'muted'}
                          />
                        ) : null}
                        {sell ? (
                          <ListItem
                            label={'Sold'}
                            value={`${sell} ${currency}`}
                            textType={'muted'}
                          />
                        ) : null}
                        {pnl ? (
                          <ListItem
                            label={'Profit / Loss'}
                            value={`${pnl} ${currency}`}
                            textType={'warning'}
                          />
                        ) : null}
                        {dividend ? (
                          <ListItem
                            label={'Dividends'}
                            value={`${dividend} ${currency}`}
                            textType={dividend > 0 ? 'success' : 'danger'}
                          />
                        ) : null}
                        {pnl && dividend ? (
                          <ListItem
                            label={'Profit'}
                            value={getProfitValue(pnl, dividend, currency)}
                            textType={'success'}
                          />
                        ) : null}
                        <hr className='mt-0 mb-0' />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ))}

        {
          <div className='col-lg-12 col-xl-3 grid-margin'>
            <div className='card'>
              <div className='card-body'>
                <h5>
                  Pension{' '}
                  <button
                    type='button'
                    className='btn btn-outline-success btn-sm border-0 bg-transparent'
                    onClick={() => dispatch(pensionApi.getList())}
                  >
                    <i className='mdi mdi-refresh' />
                  </button>
                </h5>
                {pension.loading ? (
                  <Circles />
                ) : (
                  <>
                    <ListItem
                      label={'Active (RON)'}
                      value={pension.results
                        ?.map((p) => getEvaluation(p, true))
                        .reduce(
                          (accumulator, currentValue) =>
                            accumulator + Number.parseFloat(currentValue),
                          0
                        )
                        .toFixed(2)}
                      textType={'info'}
                    />
                    <ListItem
                      label={'Profit / Loss'}
                      value={pension.results
                        ?.map((p) => getPnl(p, true))
                        .reduce((acc, val) => acc + Number.parseFloat(val), 0)
                        .toFixed(2)}
                      textType={'warning'}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        }
      </div>

      {/* Marquee - Next bond interest */}
      <div className='row'>
        <div className='col-sm-12 grid-margin'>
          <div className='card'>
            <div className='card-body'>
              <h6>Next bond interest</h6>
              {investments.loading && <Circles />}
              {!investments.loading && investments.bonds?.next_interest && (
                <Marquee pauseOnHover>
                  <ListItem
                    label={'Date'}
                    value={formatDate(
                      new Date(
                        [...investments.bonds.next_interest.interest_dates]
                          .sort(
                            (left, right) => new Date(left) - new Date(right)
                          )
                          .find((d) => new Date(d) > new Date())
                      )
                    )}
                    textType={'warning'}
                    className='mr-3'
                  />
                  <ListItem
                    label={'Ticker'}
                    value={investments.bonds.next_interest.ticker}
                    textType={'primary'}
                    className='mr-3'
                  />
                  <ListItem
                    label={'Amount'}
                    value={`${investments.bonds.next_interest.net} ${investments.bonds.next_interest.currency}`}
                    textType={'success'}
                    className='mr-3'
                  />
                  <ListItem
                    label={'Interest'}
                    value={`${Number.parseFloat(
                      (((investments.bonds.next_interest.interest / 100) *
                        -investments.bonds.next_interest.net) /
                        12) *
                        investments.bonds.next_interest.months
                    ).toFixed(
                      2
                    )} ${investments.bonds.next_interest.currency} (${investments.bonds.next_interest.interest}%)`}
                    textType={'success'}
                    className='mr-3'
                  />
                </Marquee>
              )}
              {!investments.loading && !investments.bonds?.next_interest && '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Marquee - Next deposit maturity */}
      <div className='row'>
        <div className='col-sm-12 grid-margin'>
          <div className='card'>
            <div className='card-body'>
              <h6>Next deposit maturity</h6>
              {investments.loading && <Circles />}
              {!investments.loading && investments.deposits?.next_maturity && (
                <Marquee pauseOnHover>
                  <ListItem
                    label={'Date'}
                    value={formatDate(
                      new Date(investments.deposits.next_maturity.maturity)
                    )}
                    textType={'warning'}
                    className='mr-3'
                  />
                  <ListItem
                    label={'Name'}
                    value={investments.deposits.next_maturity.name}
                    textType={'primary'}
                    className='mr-3'
                  />
                  <ListItem
                    label={'Amount'}
                    value={`${investments.deposits.next_maturity.amount} ${investments.deposits.next_maturity.currency}`}
                    textType={'warning'}
                    className='mr-3'
                  />
                  <ListItem
                    label={'Interest'}
                    value={`${Number.parseFloat(
                      (((investments.deposits.next_maturity.interest / 100) *
                        investments.deposits.next_maturity.amount) /
                        12) *
                        investments.deposits.next_maturity.months
                    ).toFixed(
                      2
                    )} ${investments.deposits.next_maturity.currency} (${investments.deposits.next_maturity.interest}%)`}
                    textType={'success'}
                    className='mr-3'
                  />
                </Marquee>
              )}
              {!investments.loading &&
                !investments.deposits?.next_maturity &&
                '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Line charts - Bonds, Deposits, Pensions */}
      <div className='row'>
        {['bonds', 'deposits'].map((entity) =>
          investments[entity]?.currencies?.map((currency) => (
            <div
              key={`${entity}-rates-${currency}`}
              className='col-sm-4 grid-margin stretch-card'
            >
              <div className='card'>
                <div className='card-body'>
                  <h6 className='card-title'>
                    {entity[0].toUpperCase() + entity.slice(1)} - {currency}{' '}
                    interest
                    <button
                      type={'button'}
                      className={
                        'btn btn-outline-success btn-sm border-0 bg-transparent'
                      }
                      onClick={() => dispatch(api.getList())}
                    >
                      <i className={'mdi mdi-refresh'} />
                    </button>
                  </h6>
                  {investments.loading ? (
                    <Circles />
                  ) : (
                    <Line
                      data={{
                        labels: investments[entity]?.[
                          `interest_rates_${currency}`
                        ]?.map((rate) => rate.date),
                        datasets: [
                          {
                            label: entity,
                            data: investments[entity]?.[
                              `interest_rates_${currency}`
                            ].map((rate) => rate.interest),
                            backgroundColor: 'rgba(255, 159, 64, 0.2)',
                            borderColor: 'rgb(76,255,0)',
                            borderWidth: 1,
                            fill: false,
                          },
                        ],
                      }}
                      options={{
                        scales: {
                          y: {
                            ticks: { beginAtZero: true, precision: 0.1 },
                            gridLines: { color: 'rgba(204, 204, 204,0.1)' },
                          },
                          x: {
                            gridLines: { color: 'rgba(204, 204, 204,0.1)' },
                            stacked: true,
                          },
                        },
                        legend: { display: true },
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {pension.results?.map((p) => (
          <div key={p.id} className='col-sm-12 grid-margin stretch-card'>
            <div className='card'>
              <div className='card-body'>
                <h6 className='card-title'>
                  {p.name}
                  <button
                    type={'button'}
                    className={
                      'btn btn-outline-success btn-sm border-0 bg-transparent'
                    }
                    onClick={() => dispatch(pensionApi.getList())}
                  >
                    <i className={'mdi mdi-refresh'} />
                  </button>
                </h6>
                {pension.loading ? (
                  <Circles />
                ) : (
                  <div className={'row'}>
                    <div className={'col-lg-6'}>
                      <Line
                        data={{
                          labels: p.contributions
                            ?.map((item) => item.date)
                            .reverse(),
                          datasets: [
                            {
                              data: p.contributions
                                ?.map((item) => item.amount)
                                .reverse(),
                              backgroundColor: 'rgba(255, 159, 64, 0.2)',
                              borderColor: 'rgb(76,255,0)',
                              borderWidth: 1,
                              fill: false,
                              label: 'Contribution',
                            },
                          ],
                        }}
                        options={{
                          scales: {
                            y: {
                              ticks: { beginAtZero: true, precision: 0.1 },
                              gridLines: { color: 'rgba(204, 204, 204,0.1)' },
                            },
                            x: {
                              gridLines: { color: 'rgba(204, 204, 204,0.1)' },
                              stacked: true,
                            },
                          },
                        }}
                      />
                    </div>
                    <div className={'col-lg-6'}>
                      <Line
                        data={{
                          labels: p.contributions
                            ?.map((item) => item.date)
                            .reverse(),
                          datasets: [
                            {
                              data: p.contributions
                                ?.map((item) => item.unit_value)
                                .reverse(),
                              backgroundColor: 'rgba(255, 159, 64, 0.2)',
                              borderColor: 'rgb(12,57,198)',
                              borderWidth: 1,
                              fill: false,
                              label: 'Value',
                            },
                          ],
                        }}
                        options={{
                          scales: {
                            y: {
                              ticks: { beginAtZero: true, precision: 0.1 },
                              gridLines: { color: 'rgba(204, 204, 204,0.1)' },
                            },
                            x: {
                              gridLines: { color: 'rgba(204, 204, 204,0.1)' },
                              stacked: true,
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Summary;
