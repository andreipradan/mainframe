import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";

import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import Select from "react-select";
import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";
import "react-datepicker/dist/react-datepicker.css";

import { FinanceApi } from "../../api/finance";
import { useHistory } from "react-router-dom";
import { selectStyles } from "./Categorize/EditModal";
import { setKwargs } from "../../redux/exchangeSlice";
import {Bar} from "react-chartjs-2";


const ExchangeRate = () => {
  const dispatch = useDispatch();
  const history = useHistory()

  const token = useSelector((state) => state.auth.token)
  const exchange = useSelector(state => state.exchange)

  const [alertOpen, setAlertOpen] = useState(false)

  const currentPage = !exchange.previous
    ? 1
    : (parseInt(new URL(exchange.previous).searchParams.get("page")) || 1) + 1

  const lastPage = Math.ceil(exchange.count / 25)


  useEffect(() => {setAlertOpen(!!exchange.errors)}, [exchange.errors])
  useEffect(() => {
    !exchange.results && dispatch(FinanceApi.getExchangeRates(token))
  }, [exchange.results])

  const onFromCurrencyChange = newValue => {
    const kwargs = {...exchange.kwargs  || {}}
    if (newValue) kwargs.from_currency = newValue.value
    else delete kwargs.from_currency
    dispatch(setKwargs(kwargs))
    dispatch(FinanceApi.getExchangeRates(token, kwargs))
  }

  const onToCurrencyChange = newValue => {
    const kwargs = {...exchange.kwargs  || {}}
    if (newValue) kwargs.to_currency = newValue.value
    else delete kwargs.to_currency
    dispatch(setKwargs(kwargs))
    dispatch(FinanceApi.getExchangeRates(token, kwargs))
  }

  const onSourceChange = newValue => {
    const kwargs = {...exchange.kwargs  || {}}
    if (newValue) kwargs.source = newValue.value
    else delete kwargs.source
    dispatch(setKwargs(kwargs))
    dispatch(FinanceApi.getExchangeRates(token, kwargs))
  }

  const uniqueFrom = [...new Set(exchange.results.map(e => e.symbol.slice(0, 3)))]
  const uniqueTo = [...new Set(exchange.results.map(e => e.symbol.slice(3)))]
  const exchangeData = {
    labels: exchange.results?.map(e => e.date).reverse(),
    datasets: [
      {
        label: `${uniqueFrom[0]} - ${uniqueTo[0]}`,
        data: exchange.results?.map(e => e.value).reverse(),
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
    ]
  };

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Exchange Rates
        {
          exchange.loading
            ? <Circles
              visible={true}
              height={20}
              width={20}
              wrapperClass="btn"
              wrapperStyle={{display: "default"}}
              ariaLabel="ball-triangle-loading"
              color='green'
            />
            : <button
              type="button"
              className="btn btn-outline-success btn-sm border-0 bg-transparent"
              onClick={() => {
                dispatch(FinanceApi.getExchangeRates(token, {date: "2023-01-23"}))
              }}
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
          }}>Credit</a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">Exchange rates</li>
        </ol>
      </nav>
    </div>
    {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{exchange.errors}</Alert>}

    {
      uniqueFrom.length === 1 && uniqueTo.length === 1 &&
        <div className="row">
          <div className="col-md-12 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                {
                  exchange.loading
                    ? <Circles />
                    : <Bar data={exchangeData} height={100}/>
                }
              </div>
            </div>
          </div>
        </div>
    }
    <div className="row">
      <div className="col-md-9 grid-margin">
        <div className="card">
          <div className="card-body">
            {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{exchange.errors}</Alert>}
            <div className="table-responsive">
              <div className="mb-0 text-muted">Total: {exchange.count}</div>
              <table className="table">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Symbol </th>
                    <th> Source </th>
                    <th> Value </th>
                  </tr>
                </thead>
                <tbody>
                {
                  exchange.results?.length
                    ? exchange.results.map((t, i) =>
                      <tr key={i}>
                        <td> {new Date(t.date).toLocaleDateString()}</td>
                        <td>{t.symbol}</td>
                        <td> {t.source}</td>
                        <td> {t.value} </td>
                      </tr>)
                    : <tr><td colSpan={6}><span>No transactions found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
            <div className="align-self-center btn-group mt-4 mr-4" role="group" aria-label="Basic example">
              <button
                type="button"
                className="btn btn-default"
                disabled={!exchange.previous}
                onClick={() => dispatch(FinanceApi.getExchangeRates(token, {page: 1}))}
              >
                <i className="mdi mdi-skip-backward"/>
              </button>
              {
                currentPage - 5 > 0 && <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getExchangeRates(token, {page: 2}))}
                >
                  2
                </button>
              }
              {currentPage - 4 > 0 && "..."}
              {
                currentPage - 3 > 0 &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getExchangeRates(token, {page: currentPage - 3}))}
                >
                  {currentPage - 3}
                </button>
              }
              {
                currentPage - 2 > 0 &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getExchangeRates(token, {page: currentPage - 2}))}
                >
                  {currentPage - 2}
                </button>
              }
              {
                exchange.previous &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getExchangeRates(token, {
                    page: currentPage - 1,
                  }))}
                >
                  {currentPage - 1}
                </button>
              }
              <button type="button" className="btn btn-primary rounded" disabled={true}>{currentPage}</button>
              {
                exchange.next &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getExchangeRates(token, {
                    page: currentPage + 1,
                 }))}
                >
                  {currentPage + 1}
                </button>
              }
              {
                currentPage + 2 < lastPage &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getExchangeRates(token, {
                    page: currentPage + 2,
                  }))}
                >
                  {currentPage + 2}
                </button>
              }
              {
                currentPage + 3 < lastPage &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getExchangeRates(token, {
                    page: currentPage + 3,
                  }))}
                >
                  {currentPage + 3}
                </button>
              }
              {currentPage + 4 < lastPage && "..."}
              {
                currentPage + 5 < lastPage &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getExchangeRates(token, {
                    page: lastPage - 1,
                  }))}
                >
                  {lastPage - 1}
                </button>
              }
              <button
                type="button"
                className="btn btn-default"
                disabled={!exchange.next}
                onClick={() => dispatch(FinanceApi.getExchangeRates(token, {
                  page: lastPage,
                }))}
              >
                <i className="mdi mdi-skip-forward"/>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="col-md-3 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Filters</h4>
            <Form onSubmit={e => {
              e.preventDefault()
              dispatch(FinanceApi.getExchangeRates(token))
            }}>
              <Form.Group>
                <Form.Label>From Currency</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={exchange.loading}
                  isLoading={exchange.loading}
                  onChange={onFromCurrencyChange}
                  options={exchange.symbols?.map(c => ({label: c.slice(0, 3), value: c.slice(0, 3)}))}
                  styles={selectStyles}
                  value={
                    exchange.kwargs?.from_currency
                        ? ({
                          label: exchange.kwargs?.from_currency,
                          value: exchange.kwargs?.from_currency
                        })
                        : null
                }
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>To Currency</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={exchange.loading}
                  isLoading={exchange.loading}
                  onChange={onToCurrencyChange}
                  options={[...new Set(exchange.symbols?.map(c => c.slice(3)))].map(c => ({label: c, value: c}))}
                  styles={selectStyles}
                  value={
                    exchange.kwargs?.to_currency
                        ? ({
                          label: exchange.kwargs?.to_currency,
                          value: exchange.kwargs?.to_currency
                        })
                        : null
                }
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Source</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={exchange.loading}
                  isLoading={exchange.loading}
                  onChange={onSourceChange}
                  options={exchange.sources?.map(c => ({label: c, value: c}))}
                  styles={selectStyles}
                  value={
                    exchange.kwargs?.source
                        ? ({
                          label: exchange.kwargs.source,
                          value: exchange.kwargs.source
                        })
                        : null
                }
                />
              </Form.Group>

            </Form>
          </div>
        </div>
      </div>
    </div>

  </div>
}

export default ExchangeRate;