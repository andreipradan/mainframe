import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import Form from "react-bootstrap/Form";
import Marquee from "react-fast-marquee";
import Select from "react-select";
import { Circles } from "react-loader-spinner";
import { Collapse } from 'react-bootstrap';

import BottomPagination from "../../shared/BottomPagination";
import Errors from "../../shared/Errors";
import ListItem from "../../shared/ListItem";
import { capitalize } from "../../utils";
import { calculateSum } from "../utils";
import { setKwargs as setPnlKwargs } from "../../../redux/pnlSlice";
import { setKwargs } from "../../../redux/stocksSlice";
import { selectStyles } from "../Accounts/Categorize/EditModal";
import { StocksApi, StocksPnlApi } from '../../../api/finance';
import { useHistory } from 'react-router-dom';

const Stocks = () => {
  const dispatch = useDispatch();
  const history = useHistory()

  const pnl = useSelector(state => state.pnl)
  const stocks = useSelector(state => state.stocks)
  const token = useSelector((state) => state.auth.token)

  const pnlApi = new StocksPnlApi(token)
  const stocksApi = new StocksApi(token)

  const [selectedPnlFile, setSelectedPnlFile] = useState(null)
  const [uploadPnlOpen, setUploadPnlOpen] = useState(false)
  const [pnlFileError, setPnlFileError] = useState(null)

  const handlePnlFileChange = e => {
    if (!e.target.files[0].name.endsWith(".csv"))
      setPnlFileError("File must be csv!")
    else {
      setSelectedPnlFile(e.target.files[0]);
      setPnlFileError(null)
    }
  };
  const handlePnlSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('file', selectedPnlFile);
    dispatch(pnlApi.upload(formData))
    setUploadPnlOpen(false)
    setSelectedPnlFile(null)
  };

  const [selectedTransactionsFile, setSelectedTransactionsFile] = useState(null)
  const [uploadTransactionsOpen, setUploadTransactionsOpen] = useState(false)
  const [transactionsFileError, setTransactionsFileError] = useState(null)

  const handleTransactionsFileChange = e => {
    if (!e.target.files[0].name.endsWith(".csv"))
      setTransactionsFileError("File must be csv!")
    else {
      setSelectedTransactionsFile(e.target.files[0]);
      setTransactionsFileError(null)
    }
  };
  const handleTransactionsSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('file', selectedTransactionsFile);
    dispatch(stocksApi.upload(formData))
    setUploadTransactionsOpen(false)
    setSelectedTransactionsFile(null)
  };

  const onCurrencyChange = (newValue, store) => {
    let setKwargsMethod;
    if (store === stocks) {
      setKwargsMethod = setKwargs;
    }
    else if (store === pnl) {
      setKwargsMethod = setPnlKwargs;
    }
    else throw Error("Invalid store")

    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargsMethod({...(store.kwargs || {}), currency: newTypes, page: 1}))
  }

  const onTickerChange = (newValue, store = stocks) => {
    const setKwargsMethod = store === stocks ? setKwargs : setPnlKwargs;
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargsMethod({...(store.kwargs || {}), ticker: newTypes, page: 1}))
  }

  const onTypeChange = (newValue, store) => {
    const setKwargsMethod = store === stocks ? setKwargs : setPnlKwargs;
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargsMethod({...(store.kwargs || {}), type: newTypes, page: 1}))
  }
  useEffect(() => setUploadPnlOpen(Boolean(stocks.errors)), [stocks.errors]);

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Stocks
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(stocksApi.getList(stocks.kwargs))}
        >
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <span
              className={"cursor-pointer text-primary"}
              onClick={() => history.push("/investments/summary")}
            >
              Investments
            </span>
          </li>
          <li className="breadcrumb-item active" aria-current="page">Stocks</li>
        </ol>
      </nav>
    </div>

    <Errors errors={stocks.errors}/>

    {/* Top cards */}
    <div className="row">
      <div className={`col-sm-${stocks.loading && !stocks.results ? 12 : 4} grid-margin`}>
        <div className="card">
          <div className="card-body">
            <h6>
              Portfolio&nbsp;
              {
                stocks.loading
                  ? <Circles height={20} width={20} wrapperStyle={{ display: 'default' }} wrapperClass="btn" />
                  : `(${stocks?.aggregations?.quantities?.length})`
              }
            </h6>
            {
              !stocks.loading && stocks.aggregations && <div style={{ maxHeight: '22vh', overflowY: 'scroll' }}>
                <ListItem label={'Total'} value={calculateSum(stocks.aggregations.quantities, 'value')}
                          textType={'warning'} className="mr-3" />
                {
                  stocks.aggregations?.quantities?.map(q =>
                    <ListItem key={q.ticker} label={q.ticker} value={q.value} textType={'warning'} className="mr-3" />,
                  )
                }
              </div>
            }
          </div>
        </div>
      </div>
      {
        stocks.currencies?.map(currency =>
          <div className="col-sm-4 grid-margin" key={currency}>
            <div className="card">
              <div className="card-body">
                <h6>
                  {currency}&nbsp;
                  {
                    stocks.loading
                      ? <Circles height={20} width={20} wrapperStyle={{ display: 'default' }} wrapperClass="btn" />
                      : `(${stocks.aggregations?.[currency].counts[0].value})`
                  }
                </h6>
                <div style={{ maxHeight: '22vh', overflowY: 'scroll' }}>
                  {
                    !stocks.loading && stocks.aggregations?.[currency].totals.map((item, i) =>
                      <ListItem
                        key={item.type}
                        label={capitalize(item.type.replace('_', ' '))}
                        value={item.value ? `${currency === 'USD' ? '$' : '€'} ${item.value} (${stocks.aggregations?.[currency].counts[i + 1].value})` : '-'}
                        textType={'warning'}
                      />,
                    )
                  }
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>

    {/* Last Transaction */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Last Transaction</h6>
            {
              stocks.loading
                ? <Circles width="100%" height="50" />
                : stocks.results?.length
                  ? <Marquee duration={10000} pauseOnHover >
                    <ListItem label={"Date"} value={new Date(stocks.results[0].date).toLocaleString()} textType={"warning"} className="mr-3" />
                    <ListItem label={"Type"} value={stocks.results[0].type} textType={"warning"} className="mr-3" />
                    {stocks.results[0].quantity && <ListItem label={"Quantity"} value={stocks.results[0].quantity} textType={"warning"} className="mr-3" />}
                    {stocks.results[0].ticker && <ListItem label={"Ticker"} value={stocks.results[0].ticker} textType={"warning"} className="mr-3" />}
                    {stocks.results[0].price_per_share && <ListItem label={"Price / Share"} value={stocks.results[0].price_per_share} textType={"warning"} className="mr-3" />}
                    <ListItem label={"Amount"} value={`${stocks.results[0].currency === "USD" ? "$" : "€"} ${stocks.results[0].total_amount}`} textType={"success"} className="mr-3" />
                    <ListItem label={"FX Rate"} value={stocks.results[0].fx_rate} textType={"warning"} className="mr-3" />
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Profit and loss */}
    <div className="row">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              <Errors errors={pnl.errors}/>

              <button
                type="button"
                className="btn btn-outline-primary btn-sm border-0 bg-transparent float-right"
                onClick={() => setUploadPnlOpen(!uploadPnlOpen)}
              >
                <i className="mdi mdi-upload" />
              </button>
              <Collapse in={uploadPnlOpen}>
                <Form onSubmit={handlePnlSubmit} className="form-inline">
                  <Form.Group>
                    {pnlFileError ? <Errors errors={[pnlFileError]} /> : null}
                    <div className="custom-file">
                      <Form.Control
                        type="file"
                        className="form-control visibility-hidden"
                        id="customFileLang"
                        lang="es"
                        onChange={handlePnlFileChange}
                      />
                      <label className="custom-file-label" htmlFor="customFileLang">
                        {selectedPnlFile ? selectedPnlFile.name : 'Select a CSV file'}
                      </label>
                    </div>
                  </Form.Group>
                  <button
                    disabled={!selectedPnlFile}
                    type="submit"
                    className="btn btn-outline-warning ml-3 btn-sm"
                  >
                    <i className="mdi mdi-upload" /> Upload
                  </button>
                </Form>
              </Collapse>
            </h4>

            <div className="table-responsive">
              <div className="mb-0 text-muted">
                <div className="row">
                  <div className="col-sm-6">
                    <h6 className="text-secondary">
                      Profit and Loss ({pnl.count})
                      <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent"
                              onClick={() => dispatch(pnlApi.getList(pnl.kwargs))}>
                        <i className="mdi mdi-refresh" />
                      </button>
                      {
                        pnl.currencies?.length && pnl.total && <div className="mb-0 text-muted">
                          <div className="row">
                            <div className="col-sm-6">
                              <div className="mb-0 text-muted">
                                <ul className="list-arrow">
                                  {
                                    pnl.currencies.map(c =>
                                      <li key={c}
                                          className={pnl.total[c] < 0 ? 'text-danger' : pnl.total[c] > 0 ? 'text-success' : 'text-warning'}>
                                        {pnl.total[c] < 0 ? '-' : null} {c === 'USD' ? '$' : c}{pnl.total[c] < 0 ? -pnl.total[c] : pnl.total[c]}
                                      </li>,
                                    )
                                  }
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    </h6>
                  </div>
                  <div className="col-sm-6">
                    <Form
                      className="row"
                      onSubmit={e => {
                        e.preventDefault();
                        dispatch(pnlApi.getList(pnl.kwargs));
                      }}
                    >
                      <Form.Group className="col-md-6">
                        <Form.Label>Currency</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={pnl.loading}
                          isLoading={pnl.loading}
                          isMulti
                          onChange={(e) => onCurrencyChange(e, pnl)}
                          options={pnl.currencies?.map(t => ({ label: t, value: t }))}
                          styles={selectStyles}
                          value={pnl.kwargs.currency?.map(t => ({ label: t, value: t }))}
                        />
                      </Form.Group>
                      <Form.Group className="col-md-6">
                        <Form.Label>Ticker</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={pnl.loading}
                          isLoading={pnl.loading}
                          isMulti
                          onChange={(e) => onTickerChange(e, pnl)}
                          options={pnl.tickers?.map(t => ({ label: t, value: t }))}
                          styles={selectStyles}
                          value={pnl.kwargs.ticker?.map(t => ({ label: t, value: t }))}
                        />
                      </Form.Group>
                    </Form>
                  </div>
                </div>
              </div>

              <table className="table table-hover">
                <thead>
                <tr>
                  <th>Sold on</th>
                  <th>Acquired on</th>
                  <th>Ticker</th>
                  <th>Company</th>
                  <th>Quantity</th>
                  <th>Buy price</th>
                  <th>Sell price</th>
                  <th>PnL</th>
                </tr>
                </thead>
                <tbody>
                {
                  pnl.loading
                    ? <Circles
                      visible
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{ float: 'right' }}
                      color="orange"
                    />
                    : pnl.results?.length
                      ? pnl.results.map(transaction => <tr key={transaction.id}>
                        <td> {new Date(transaction.date_sold).toLocaleDateString()} </td>
                        <td> {new Date(transaction.date_acquired).toLocaleDateString()} </td>
                        <td style={{ cursor: 'pointer' }} onClick={() => onTickerChange([{ value: transaction.ticker }], pnl)}> {transaction.ticker}</td>
                        <td style={{ cursor: 'pointer' }} onClick={() => onTickerChange([{ value: transaction.ticker }], pnl)}> {transaction.security_name}<sup>[{transaction.country}]</sup> </td>
                        <td> {parseFloat(transaction.quantity)} </td>
                        <td> {transaction.currency === 'USD' ? '$' : '€'}{transaction.cost_basis} </td>
                        <td> {transaction.currency === 'USD' ? '$' : '€'}{transaction.amount} </td>
                        <td className={`text-${transaction.pnl < 0 ? 'danger' : 'success'}`}> {transaction.pnl} </td>
                      </tr>)
                      : <tr>
                        <td colSpan={6}><span>No transactions found</span></td>
                      </tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={pnl} fetchMethod={pnlApi.getList} newApi={true} setKwargs={setPnlKwargs} />

          </div>
        </div>
      </div>
    </div>

    {/* Transactions */}
    <div className="row">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              <Errors errors={stocks.errors}/>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm border-0 bg-transparent float-right"
                onClick={() => setUploadTransactionsOpen(!uploadTransactionsOpen)}
              >
                <i className="mdi mdi-upload" />
              </button>
              <Collapse in={uploadTransactionsOpen}>
                <Form onSubmit={handleTransactionsSubmit} className="form-inline">
                  <Form.Group>
                    {transactionsFileError ? <Errors errors={[transactionsFileError]} /> : null}
                    <div className="custom-file">
                      <Form.Control
                        type="file"
                        className="form-control visibility-hidden"
                        id="transactionsFile"
                        lang="es"
                        onChange={handleTransactionsFileChange}
                      />
                      <label className="custom-file-label" htmlFor="transactionsFile">
                        {selectedTransactionsFile ? selectedTransactionsFile.name : 'Select a CSV file'}
                      </label>
                    </div>
                  </Form.Group>
                  <button
                    disabled={!selectedTransactionsFile}
                    type="submit"
                    className="btn btn-outline-warning ml-3 btn-sm"
                  >
                    <i className="mdi mdi-upload" /> Upload
                  </button>
                </Form>
              </Collapse>
            </h4>

            <div className="table-responsive">
              <div className="mb-0 text-muted">
                <div className="row">
                  <div className="col-sm-6">
                    <h6 className="text-secondary">
                      Transactions: {stocks.count}
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm border-0 bg-transparent"
                        onClick={() => dispatch(stocksApi.getList(stocks.kwargs))}
                      >
                        <i className="mdi mdi-refresh" />
                      </button>
                    </h6>
                    {
                      Object.keys(stocks.kwargs).length
                        ? <small className="text-warning">&nbsp;(
                          {
                            stocks.currencies?.map(c => `${c === 'USD' ? '$' : '€'} ${stocks.aggregations?.current[`total_${c}`]}`).filter(i => !i.includes(' null')).join(' | ')
                          })</small>
                        : null
                    }
                  </div>
                  <div className="col-sm-6">
                    <Form
                      className="row float-right"
                      onSubmit={e => {
                        e.preventDefault();
                        dispatch(stocksApi.getList(stocks.kwargs));
                      }}
                    >
                      <Form.Group className="col-md-4">
                        <Form.Label>Currency</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={stocks.loading}
                          isLoading={stocks.loading}
                          isMulti
                          onChange={e => onCurrencyChange(e, stocks)}
                          options={stocks.currencies?.map(t => ({ label: t, value: t }))}
                          styles={selectStyles}
                          value={stocks.kwargs.currency?.map(t => ({ label: t, value: t }))}
                        />
                      </Form.Group>
                      <Form.Group className="col-md-4">
                        <Form.Label>Type</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={stocks.loading}
                          isLoading={stocks.loading}
                          isMulti
                          onChange={e => onTypeChange(e, stocks)}
                          options={stocks.types?.map(t => ({ label: t[1], value: t[0] }))}
                          styles={selectStyles}
                          value={stocks.kwargs.type?.map(t => ({
                            label: stocks.types.find(ty => ty[0] === t)[1],
                            value: t
                          }))}
                        />
                      </Form.Group>
                      <Form.Group className="col-md-4">
                        <Form.Label>Ticker</Form.Label>&nbsp;
                        <Select
                          id={"stocksTickerSelect"}
                          closeMenuOnSelect={false}
                          isDisabled={stocks.loading}
                          isLoading={stocks.loading}
                          isMulti
                          onChange={(e) => onTickerChange(e, stocks)}
                          options={stocks.tickers?.map(t => ({ label: t, value: t }))}
                          styles={selectStyles}
                          value={stocks.kwargs.ticker?.map(t => ({ label: t, value: t }))}
                        />
                      </Form.Group>
                    </Form>
                  </div>
                </div>
              </div>
              <table className="table table-hover">
                <thead>
                <tr>
                  <th> Date</th>
                  <th> Type</th>
                  <th> Quantity</th>
                  <th> Ticker</th>
                  <th> Price / Share</th>
                  <th> Amount</th>
                  <th> FX Rate</th>
                </tr>
                </thead>
                <tbody>
                {
                  stocks.loading
                    ? <Circles
                      visible
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{ float: "right" }}
                      color='orange'
                    />
                    : stocks.results?.length
                      ? stocks.results.map(transaction => <tr key={transaction.id}>
                        <td> {new Date(transaction.date).toLocaleString()} </td>
                        <td style={{ cursor: "pointer" }}
                            onClick={() => onTypeChange([{ value: stocks.types.find(t => t[1] === transaction.type)[0] }])}> {transaction.type} </td>
                        <td> {transaction.quantity} </td>
                        <td style={{ cursor: "pointer" }}
                            onClick={() => onTickerChange([{ value: transaction.ticker }])}> {transaction.ticker} </td>
                        <td> {transaction.price_per_share} </td>
                        <td> {transaction.currency === "USD" ? "$" : "€"} {transaction.total_amount} </td>
                        <td> {transaction.fx_rate} </td>
                      </tr>)
                      : <tr>
                        <td colSpan={6}><span>No transactions found</span></td>
                      </tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={stocks} fetchMethod={stocksApi.getList} newApi={true} setKwargs={setKwargs} />

          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Stocks;