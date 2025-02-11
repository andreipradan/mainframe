import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";

import Form from "react-bootstrap/Form";
import Select from "react-select";
import { Bar } from "react-chartjs-2";
import { Circles } from "react-loader-spinner";
import "react-datepicker/dist/react-datepicker.css";

import ExchangeApi from "../../api/exchange";
import { selectStyles } from "../finances/Accounts/Categorize/EditModal";
import { setKwargs } from "../../redux/exchangeSlice";
import BottomPagination from "../shared/BottomPagination";
import Errors from "../shared/Errors";


const ExchangeRates = () => {
  const dispatch = useDispatch();
  const history = useHistory()

  const token = useSelector((state) => state.auth.token)
  const exchange = useSelector(state => state.exchange)

  const api = new ExchangeApi(token);

  const onFromCurrencyChange = newValue => {
    const kwargs = {...exchange.kwargs  || {}}
    if (newValue) kwargs.from_currency = newValue.value
    else delete kwargs.from_currency
    dispatch(setKwargs(kwargs))
  }

  const onToCurrencyChange = newValue => {
    const kwargs = {...exchange.kwargs  || {}}
    if (newValue) kwargs.to_currency = newValue.value
    else delete kwargs.to_currency
    dispatch(setKwargs(kwargs))
  }

  const onSourceChange = newValue => {
    const kwargs = {...exchange.kwargs  || {}}
    if (newValue) kwargs.source = newValue.value
    else delete kwargs.source
    dispatch(setKwargs(kwargs))
  }

  const uniqueFrom = [...new Set(exchange.results?.map(e => e.symbol.slice(0, 3)))]
  const uniqueTo = [...new Set(exchange.results?.map(e => e.symbol.slice(3)))]
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
              visible
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
              onClick={() => dispatch(api.getList(exchange.kwargs))}
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
          }}>Credit</a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">Exchange rates</li>
        </ol>
      </nav>
    </div>
    <Errors errors={exchange.errors}/>

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
                  exchange.loading
                    ? <tr>
                        <td colSpan={4}>
                          <Circles
                            visible
                            wrapperStyle={{
                              display: "block",
                              marginLeft: "auto",
                              marginRight: "auto",
                              width: "25%"
                            }}
                            wrapperClass="btn"
                            ariaLabel="ball-triangle-loading"
                            color='green'
                          />
                        </td>
                      </tr>
                    : exchange.results?.length
                      ? exchange.results.map(t =>
                        <tr key={t.id}>
                          <td> {new Date(t.date).toLocaleDateString()}</td>
                          <td>{t.symbol}</td>
                          <td> {t.source}</td>
                          <td> {t.value} </td>
                        </tr>)
                      : <tr><td colSpan={6} className="text-center"><span>No rates found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={exchange} fetchMethod={api.getList} newApi={true} setKwargs={setKwargs} perPage={31}/>
          </div>
        </div>
      </div>
      <div className="col-md-3 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Filters</h4>
            <Form onSubmit={e => {
              e.preventDefault()
              dispatch(api.getList(exchange.kwargs))
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

export default ExchangeRates;