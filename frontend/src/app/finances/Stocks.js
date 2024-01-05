import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import Marquee from "react-fast-marquee";
import "nouislider/distribute/nouislider.css";

import { StocksApi } from "../../api/finance";
import { setKwargs } from "../../redux/stocksSlice";
import { selectStyles } from "./Categorize/EditModal";
import BottomPagination from "../shared/BottomPagination";
import Errors from "../shared/Errors";
import Form from "react-bootstrap/Form";
import ListItem from "../shared/ListItem";
import Select from "react-select";
import {capitalize} from "./Accounts/AccountDetails/AccountDetails";
import { calculateSum } from "./utils";

const Stocks = () => {
  const dispatch = useDispatch();
  const stocks = useSelector(state => state.stocks)
  const token = useSelector((state) => state.auth.token)

  const onCurrencyChange = newValue => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({...(stocks.kwargs || {}), currency: newTypes, page: 1}))
  }

  const onTickerChange = newValue => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({...(stocks.kwargs || {}), ticker: newTypes, page: 1}))
  }

  const onTypeChange = newValue => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({...(stocks.kwargs || {}), type: newTypes, page: 1}))
  }

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Stocks
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(StocksApi.getList(token))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item active" aria-current="page">Stocks</li>
        </ol>
      </nav>
    </div>

    <Errors errors={stocks.errors}/>

    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Portfolio ({stocks.aggregations?.quantities?.length ? stocks.aggregations.quantities.length : <Circles width = "100%" height = "50" />})</h6>
            {
              stocks.loading
                ? <Circles width = "100%" height = "50" />
                : stocks.aggregations?.quantities?.length
                  ? <Marquee duration={10000} pauseOnHover={true} >
                    <ListItem label={"Total"} value={calculateSum(stocks.aggregations.quantities, "value")} textType={"warning"} className="mr-3" />
                    {stocks.aggregations.quantities.map((q, i) =>
                      <ListItem label={q.ticker} value={q.value} textType={"warning"} className="mr-3" />
                    )}
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
      {
        stocks.currencies?.map((currency, i) =>
          <div className="col-sm-6 grid-margin" key={i}>
            <div className="card">
              <div className="card-body">
                <h5>{currency} ({stocks.aggregations?.[currency].counts[0].value})</h5>
                {
                  stocks.loading
                    ? <Circles width = "100%" height = "50" />
                    : <>
                      {
                        stocks.aggregations?.[currency].totals.map((item, i) =>
                          <ListItem
                              key={i}
                              label={capitalize(item.type.replace("_", " "))}
                              value={item.value ? `${currency === "USD" ? "$" : "€"} ${item.value} (${stocks.aggregations?.[currency].counts[i+1].value})` : "-"}
                              textType={"warning"}
                            />
                        )
                      }
                    </>
                }
              </div>
            </div>
          </div>
        )
      }
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Last Transaction</h6>
            {
              stocks.loading
                ? <Circles width = "100%" height = "50" />
                : stocks.results?.length
                  ? <Marquee duration={10000} pauseOnHover={true} >
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
    <div className="row">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <div className="mb-0 text-muted">
                <div className="row">
                  <div className="col-sm-6">
                    Profit and Loss
                    <div className="mb-0 text-muted">
                      <small>Total: {stocks.pnl?.length}</small>
                    </div>
                  </div>
                </div>
              </div>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Sold on </th>
                    <th> Acquired on </th>
                    <th> Ticker </th>
                    <th> Quantity </th>
                    <th> Cost basis </th>
                    <th> Amount </th>
                    <th> PnL </th>
                  </tr>
                </thead>
                <tbody>
                {
                  stocks.loading
                    ? <Circles
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                    : stocks.pnl?.length
                        ? stocks.pnl.map((transaction, i) => <tr key={i}>
                          <td> {new Date(transaction.date_sold).toLocaleDateString()} </td>
                          <td> {new Date(transaction.date_acquired).toLocaleDateString()} </td>
                          <td> {transaction.ticker} </td>
                          <td> {parseFloat(transaction.quantity)} </td>
                          <td> {transaction.currency === "USD" ? "$" : "€"}{transaction.cost_basis} </td>
                          <td> {transaction.currency === "USD" ? "$" : "€"}{transaction.amount} </td>
                          <td> {transaction.pnl} </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No transactions found</span></td></tr>
                }
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>

    <div className="row">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <div className="mb-0 text-muted">
                <div className="row">
                  <div className="col-sm-6">
                    Transactions: {stocks.count}
                    {
                      Object.keys(stocks.kwargs).length
                      ? <small className="text-warning">&nbsp;(
                          {
                            stocks.currencies?.map(c => `${c === "USD" ? "$" : "€"} ${stocks.aggregations?.current[`total_${c}`]}`).filter(i => !i.includes(" null")).join(" | ")
                          })</small>
                      : null
                    }
                  </div>
                  <div className="col-sm-6">
                    <Form
                      className="row float-right"
                      onSubmit={e => {e.preventDefault(); dispatch(StocksApi.getList(token, stocks.kwargs))}}
                    >
                      <Form.Group className="col-md-4">
                        <Form.Label>Currency</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={stocks.loading}
                          isLoading={stocks.loading}
                          isMulti
                          onChange={onCurrencyChange}
                          options={stocks.currencies?.map(t => ({label: t, value: t}))}
                          styles={selectStyles}
                          value={stocks.kwargs.currency?.map(t => ({label: t, value: t}))}
                        />
                      </Form.Group>
                      <Form.Group className="col-md-4">
                        <Form.Label>Type</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={stocks.loading}
                          isLoading={stocks.loading}
                          isMulti
                          onChange={onTypeChange}
                          options={stocks.types?.map(t => ({label: t[1], value: t[0]}))}
                          styles={selectStyles}
                          value={stocks.kwargs.type?.map(t => ({label: stocks.types.find(ty => ty[0] === t)[1], value: t}))}
                        />
                      </Form.Group>
                      <Form.Group className="col-md-4">
                        <Form.Label>Ticker</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={stocks.loading}
                          isLoading={stocks.loading}
                          isMulti
                          onChange={onTickerChange}
                          options={stocks.tickers?.map(t => ({label: t, value: t}))}
                          styles={selectStyles}
                          value={stocks.kwargs.ticker?.map(t => ({label: t, value: t}))}
                        />
                      </Form.Group>
                    </Form>
                  </div>
                </div>
              </div>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Type </th>
                    <th> Quantity </th>
                    <th> Ticker </th>
                    <th> Price / Share </th>
                    <th> Amount </th>
                    <th> FX Rate </th>
                  </tr>
                </thead>
                <tbody>
                {
                  stocks.loading
                    ? <Circles
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                    : stocks.results?.length
                        ? stocks.results.map((transaction, i) => <tr key={i}>
                          <td> {new Date(transaction.date).toLocaleString()} </td>
                          <td style={{cursor: "pointer"}} onClick={() => onTypeChange([{value: stocks.types.find(t => t[1] === transaction.type)[0]}])}> {transaction.type} </td>
                          <td> {transaction.quantity} </td>
                          <td style={{cursor: "pointer"}} onClick={() => onTickerChange([{value: transaction.ticker}])}> {transaction.ticker} </td>
                          <td> {transaction.price_per_share} </td>
                          <td> {transaction.currency === "USD" ? "$" : "€"} {transaction.total_amount} </td>
                          <td> {transaction.fx_rate} </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No transactions found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={stocks} fetchMethod={StocksApi.getList} setKwargs={setKwargs}/>

          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Stocks;