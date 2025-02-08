import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import Marquee from "react-fast-marquee";
import Form from "react-bootstrap/Form";
import Select from "react-select";
import { Circles } from "react-loader-spinner";
import { Collapse } from 'react-bootstrap';
import "nouislider/distribute/nouislider.css";

import BottomPagination from "../../shared/BottomPagination";
import Errors from "../../shared/Errors";
import ListItem from "../../shared/ListItem";
import { CryptoApi, CryptoPnlApi } from '../../../api/finance';
import { capitalize } from "../../utils";
import { setKwargs } from "../../../redux/cryptoSlice";
import { setKwargs as setPnlKwargs } from "../../../redux/cryptoPnlSlice";
import { selectStyles } from "../Accounts/Categorize/EditModal";

const Crypto = () => {
  const dispatch = useDispatch();
  const crypto = useSelector(state => state.crypto)
  const pnl = useSelector(state => state.cryptoPnl)
  const token = useSelector((state) => state.auth.token)

  const cryptoApi = new CryptoApi(token)
  const pnlApi = new CryptoPnlApi(token)

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
    dispatch(cryptoApi.upload(formData))
    setUploadTransactionsOpen(false)
    setSelectedTransactionsFile(null)
  };

  const onChange = (what, newValue, store) => {
    const newTypes = newValue.map(v => v.value)
    let setKwargsMethod
    if (store === crypto)
      setKwargsMethod = setKwargs
    else if (store === pnl)
      setKwargsMethod = setPnlKwargs
    else throw Error("Invalid store")
    dispatch(setKwargsMethod({...(store.kwargs || {}), [what]: newTypes, page: 1}))
  }

  useEffect(() => setUploadPnlOpen(Boolean(pnl.errors)), [pnl.errors]);
  useEffect(() => setUploadTransactionsOpen(Boolean(crypto.errors)), [crypto.errors]);

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Crypto
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(cryptoApi.getList())}
        >
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item active" aria-current="page">Stocks</li>
        </ol>
      </nav>
    </div>

    <Errors errors={crypto.errors}/>

    {/* Top cards */}
    <div className="row">
      <div className="col-sm-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Portfolio&nbsp;
              {
                crypto.loading
                  ? <Circles height={20} width={20} wrapperStyle={{ display: 'default' }} wrapperClass="btn" />
                  : `(${crypto?.aggregations?.quantities?.length})`
              }
            </h6>
            {
              !crypto.loading && crypto.aggregations && <div style={{ maxHeight: '22vh', overflowY: 'scroll' }}>
                {
                  crypto.aggregations?.quantities?.map(q =>
                    <ListItem key={q.symbol} label={q.symbol} value={q.value} textType={'warning'} className="mr-3" />,
                  )
                }
              </div>
            }
          </div>
        </div>
      </div>
      {
        crypto.currencies?.map(currency =>
          <div className="col-sm-4 grid-margin" key={currency}>
            <div className="card">
              <div className="card-body">
                <h6>
                  {currency}&nbsp;
                  {
                    crypto.loading
                      ? <Circles height={20} width={20} wrapperStyle={{ display: 'default' }} wrapperClass="btn" />
                      : `(${crypto.aggregations?.[currency].counts[0].value})`
                  }
                </h6>
                <div style={{ maxHeight: '22vh', overflowY: 'scroll' }}>
                  {
                    !crypto.loading && crypto.aggregations?.[currency].totals.map((item, i) =>
                      <ListItem
                        key={item.type}
                        label={capitalize(item.type.replace('_', ' '))}
                        value={item.value ? `${currency === 'USD' ? '$ ' : currency === "EUR" ? '€ ' : ""}${item.value} (${crypto.aggregations?.[currency].counts[i + 1].value})${["USD", "EUR"].includes(currency) ? "" : ` ${currency}`}` : '-'}
                        textType={'warning'}
                      />,
                    )
                  }
                </div>
              </div>
            </div>
          </div>,
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
              crypto.loading
                ? <Circles width="100%" height="50" />
                : crypto.results?.length
                  ? <Marquee duration={10000} pauseOnHover >
                    <ListItem label={"Date"} value={new Date(crypto.results[0].date).toLocaleString()} textType={"warning"} className="mr-3" />
                    <ListItem label={"Type"} value={crypto.results[0].type} textType={"warning"} className="mr-3" />
                    {crypto.results[0].quantity && <ListItem label={"Quantity"} value={crypto.results[0].quantity} textType={"warning"} className="mr-3" />}
                    {crypto.results[0].symbol && <ListItem label={"Ticker"} value={crypto.results[0].symbol} textType={"warning"} className="mr-3" />}
                    {crypto.results[0].price && <ListItem label={"Price"} value={crypto.results[0].price} textType={"warning"} className="mr-3" />}
                    {crypto.results[0].fees && <ListItem label={"Price"} value={crypto.results[0].fees} textType={"warning"} className="mr-3" />}
                    {crypto.results[0].value && <ListItem label={"Amount"} value={`${crypto.results[0].currency === "USD" ? "$ " : crypto.results[0].currency === "EUR" ? "€ ": ""}${crypto.results[0].value}${["USD", "EUR"].includes(crypto.results[0].currency) ? "" : ` ${crypto.results[0].currency}`}`} textType={"success"} className="mr-3" />}
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/*Profit and loss*/}
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
                        {selectedPnlFile ? selectedPnlFile.name : 'Select a file'}
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
                  <div className={`col-sm-${pnl.currencies?.length > 1 ? '6' : '9'}`}>
                    <h6 className="text-secondary">
                      Profit and Loss ({pnl.count})
                      <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent"
                              onClick={() => dispatch(pnlApi.getList())}>
                        <i className="mdi mdi-refresh" />
                      </button>
                      {
                        pnl.currencies?.length && pnl.total ?
                          <div className="mb-0 text-muted">
                            <div className="row">
                              <div className="col-sm-6">
                                <div className="mb-0 text-muted">
                                  <ul className="list-arrow">
                                    {
                                      pnl.currencies?.map(c =>
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
                        : null
                      }
                    </h6>
                  </div>
                  <div className={`col-sm-${pnl.currencies?.length > 1 ? '6' : '3'}`}>
                    <Form
                      className="row"
                      onSubmit={e => {
                        e.preventDefault();
                        dispatch(pnlApi.getList(pnl.kwargs));
                      }}
                    >
                      {
                        pnl.currencies?.length > 1
                          ? <Form.Group className="col-md-6">
                              <Form.Label>Currency</Form.Label>&nbsp;
                              <Select
                                closeMenuOnSelect={false}
                                isDisabled={pnl.loading}
                                isLoading={pnl.loading}
                                isMulti
                                onChange={(e) => onChange('currency', e, pnl)}
                                options={pnl.currencies?.map(t => ({ label: t, value: t }))}
                                styles={selectStyles}
                                value={pnl.kwargs.currency?.map(t => ({ label: t, value: t }))}
                              />
                            </Form.Group>
                          : null
                      }
                      <Form.Group className={`col-sm-${pnl.currencies?.length > 1 ? '6' : '12'}`}>
                        <Form.Label>Ticker</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={pnl.loading}
                          isLoading={pnl.loading}
                          isMulti
                          onChange={(e) => onChange('ticker', e, pnl)}
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
                  <th>Quantity</th>
                  <th>Buy price</th>
                  <th>Sell price</th>
                  <th>Gross PnL</th>
                  <th>Fees</th>
                  <th>Net PnL</th>
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
                        <td style={{ cursor: 'pointer' }} onClick={() => onChange('ticker', [{ value: transaction.ticker }], pnl)}> {transaction.ticker}</td>
                        <td> {parseFloat(transaction.quantity)} </td>
                        <td> {transaction.currency === 'USD' ? '$' : '€'}{transaction.cost_basis} </td>
                        <td> {transaction.currency === 'USD' ? '$' : '€'}{transaction.amount} </td>
                        <td className={`text-${transaction.gross_pnl < 0 ? 'danger' : 'success'}`}> {transaction.currency === 'USD' ? '$' : '€'}{transaction.gross_pnl} </td>
                        <td className={`text-${transaction.fees > 0 ? 'danger' : 'success'}`}> {transaction.currency === 'USD' ? '$' : '€'}{transaction.fees} </td>
                        <td className={`text-${transaction.net_pnl < 0 ? 'danger' : 'success'}`}> {transaction.currency === 'USD' ? '$' : '€'}{transaction.net_pnl} </td>
                      </tr>)
                      : <tr>
                        <td colSpan={6}><span>No pnl data found</span></td>
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
              <Errors errors={crypto.errors}/>
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
                        {selectedTransactionsFile ? selectedTransactionsFile.name : 'Select a file'}
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
                      Transactions: {crypto.count}
                      <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent"
                              onClick={() => dispatch(cryptoApi.getList(crypto.kwargs))}>
                        <i className="mdi mdi-refresh" />
                      </button>
                    </h6>
                    {
                      Object.keys(crypto.kwargs).length
                        ? <small className="text-warning">&nbsp;(
                          {
                            crypto.currencies?.map(c => `${c === 'USD' ? '$' : c === "EUR" ? '€' : c} ${crypto.aggregations?.current[`total_${c}`]}`).filter(i => !i.includes(' null')).join(' | ')
                          })</small>
                        : null
                    }
                  </div>
                  <div className="col-sm-6">
                    <Form
                      className="row float-right"
                      onSubmit={e => {
                        e.preventDefault();
                        dispatch(cryptoApi.getList(crypto.kwargs));
                      }}
                    >
                      <Form.Group className="col-md-4">
                        <Form.Label>Currency</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={crypto.loading}
                          isLoading={crypto.loading}
                          isMulti
                          onChange={e => onChange('currency', e, crypto)}
                          options={crypto.currencies?.map(t => ({ label: t, value: t }))}
                          styles={selectStyles}
                          value={crypto.kwargs.currency?.map(t => ({ label: t, value: t }))}
                        />
                      </Form.Group>
                      <Form.Group className="col-md-4">
                        <Form.Label>Type</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={crypto.loading}
                          isLoading={crypto.loading}
                          isMulti
                          onChange={e => onChange('type', e, crypto)}
                          options={crypto.types?.map(t => ({ label: t[1], value: t[0] }))}
                          styles={selectStyles}
                          value={crypto.kwargs.type?.map(t => ({
                            label: crypto.types.find(ty => ty[0] === t)[1],
                            value: t
                          }))}
                        />
                      </Form.Group>
                      <Form.Group className="col-md-4">
                        <Form.Label>Ticker</Form.Label>&nbsp;
                        <Select
                          id={"stocksTickerSelect"}
                          closeMenuOnSelect={false}
                          isDisabled={crypto.loading}
                          isLoading={crypto.loading}
                          isMulti
                          onChange={(e) => onChange('symbol', e, crypto)}
                          options={crypto.symbols?.map(t => ({ label: t, value: t }))}
                          styles={selectStyles}
                          value={crypto.kwargs.ticker?.map(t => ({ label: t, value: t }))}
                        />
                      </Form.Group>
                    </Form>
                  </div>
                </div>
              </div>
              <table className="table table-hover">
                <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Fees</th>
                  <th>Value</th>
                </tr>
                </thead>
                <tbody>
                {
                  crypto.loading
                    ? <Circles
                      visible
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{ float: "right" }}
                      color='orange'
                    />
                    : crypto.results?.length
                      ? crypto.results.map(transaction => <tr key={transaction.id}>
                        <td> {new Date(transaction.date).toLocaleString()} </td>
                        <td style={{ cursor: "pointer" }}
                            onClick={() => onChange('type', [{ value: crypto.types.find(t => t[1] === transaction.type)[0] }])}> {transaction.type} </td>
                        <td> {parseFloat(transaction.quantity)} </td>
                        <td style={{ cursor: "pointer" }}
                            onClick={() => onChange('ticker', [{ value: transaction.symbol }])}> {transaction.symbol} </td>
                        <td> {transaction.price} </td>
                        <td> {transaction.fees} </td>
                        <td> {transaction.currency === "USD" ? "$ " : transaction.currency === "EUR" ? "€ " : ""}{transaction.value}{["USD", "EUR"].includes(transaction.currency) ? "" : ` ${transaction.currency}`} </td>
                        <td> {transaction.fx_rate} </td>
                      </tr>)
                      : <tr>
                        <td colSpan={6}><span>No transactions found</span></td>
                      </tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={crypto} fetchMethod={cryptoApi.getList} newApi={true} setKwargs={setKwargs} />

          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Crypto;