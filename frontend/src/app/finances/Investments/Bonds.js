import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from 'react-router-dom';
import BottomPagination from "../../shared/BottomPagination";
import Button from 'react-bootstrap/Button';
import DatePicker from 'react-datepicker';
import Form from "react-bootstrap/Form";
import Marquee from "react-fast-marquee";
import Modal from 'react-bootstrap/Modal';
import Select from "react-select";
import { Circles, ColorRing } from 'react-loader-spinner';
import "react-datepicker/dist/react-datepicker.css";

import Errors from "../../shared/Errors";
import ListItem from "../../shared/ListItem";
import { formatDate, formatTime } from '../../earthquakes/Earthquakes';
import { selectItem, setKwargs, setModalOpen } from "../../../redux/bondsSlice";
import { selectStyles } from "../Accounts/Categorize/EditModal";
import { BondsApi } from '../../../api/finance';

const Bonds = () => {
  const dispatch = useDispatch();
  const history = useHistory()
  const state = useSelector(state => state.bonds)
  const token = useSelector((state) => state.auth.token)

  const api = new BondsApi(token)

  // const [commission, setCommission] = useState("")
  const [date, setDate] = useState(null)
  const [interest, setInterest] = useState("")
  const [interestDates, setInterestDates] = useState(null)
  // const [maturity, setMaturity] = useState(null)
  const [notes, setNotes] = useState("")
  const [net, setNet] = useState("")
  const [currency, setCurrency] = useState("")
  const [quantity, setQuantity] = useState("")
  const [pnl, setPnl] = useState("")
  const [price, setPrice] = useState("")
  // const [tax, setTax] = useState("")
  const [ticker, setTicker] = useState("")
  const [type, setType] = useState(null)

  const [activeOnlyChecked, setActiveOnlyChecked] = useState(false)

  const clearModal = () => {
    // setCommission("")
    setCurrency("")
    setDate(null)
    setInterest("")
    setInterestDates(null)
    // setMaturity(null)
    setNet("")
    setNotes("")
    setQuantity("")
    setPnl("")
    setPrice("")
    // setTax("")
    setTicker("")
    setType(null)
  }
  const closeModal = () => {
    dispatch(selectItem())
    dispatch(setModalOpen(false))
    clearModal()
  }

  const onActiveOnlyChange = () => {
    setActiveOnlyChecked(!activeOnlyChecked)
    dispatch(setKwargs({...(state.kwargs || {}), active_only: !activeOnlyChecked}))

  }
  const onChange = (what, newValue, store) => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({...(store.kwargs || {}), [what]: newTypes, page: 1}))
  }

  const onSubmit = e => {
    e.preventDefault()
    const data = {
      date: date.toISOString(),
      net,
      currency,
      notes,
      quantity,
      pnl,
      price,
      // tax,
      ticker,
      type: type ? type.value : null,
    }
    // if (commission) data.commission = commission
    if (interest) data.interest = interest
    if (interestDates)
      data.interest_dates = interestDates.map(d => d.toISOString().split("T")[0])
    // if (maturity) data.maturity = maturity.toISOString().split("T")[0]
    if (state.selectedItem)
      dispatch(api.update(state.selectedItem.id, data))
    else {
      dispatch(api.create(data));
      clearModal()
    }
  }

  useEffect(() => {
    if (state.selectedItem) {
      // setCommission(state.selectedItem.commission)
      setCurrency(state.selectedItem.currency)
      setDate(new Date(state.selectedItem.date))
      if (state.selectedItem.interest)
        setInterest(state.selectedItem.interest)
      if (state.selectedItem.interest_dates)
        setInterestDates(state.selectedItem.interest_dates.map(d => new Date(d)))
      // if (state.selectedItem.maturity)
      //   setMaturity(new Date(state.selectedItem.maturity))
      setQuantity(state.selectedItem.quantity)
      setNet(state.selectedItem.net)
      setNotes(state.selectedItem.notes)
      setPnl(state.selectedItem.pnl)
      setPrice(state.selectedItem.price)
      // setTax(state.selectedItem.tax)
      setTicker(state.selectedItem.ticker)
      const newType = {
          label: state.types.find(t => t[0] === state.selectedItem.type)[1],
          value: state.selectedItem.type
        }
      setType(newType)
    }
  }, [state.types, state.selectedItem]);

  return <div>
    {/* Top title and breadcrumbs */}
    <div className="page-header mb-0">
      <h3 className="page-title">
        Bonds
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(api.getList())}
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
          <li className="breadcrumb-item active" aria-current="page">Bonds</li>
        </ol>
      </nav>
    </div>

    <Errors errors={state.errors}/>

    {/* Top cards */}
    <div className="row">
      <div className="col-sm-12 col-xl-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Portfolio&nbsp;
              {
                state.loading
                  ? <Circles
                      height={20}
                      width={20}
                      wrapperStyle={{ display: 'default' }}
                      wrapperClass="btn"
                    />
                  : null
              }
            </h6>
            {
              !state.loading
                ? <div style={{ maxHeight: '26vh', overflowY: 'scroll' }}>
                    <ListItem
                      label={'Transactions'}
                      value={state.count}
                      textType={'primary'}
                      className="mr-3"
                    />
                  {
                    state.aggregations
                      ? state.currencies?.map(currency =>
                        <div key={currency}>
                          {
                            Object.keys(state.aggregations)
                              .filter(item => item.split("_")[1] === currency)
                              .filter(item => !!state.aggregations[item])
                              .sort()
                              .map(k => k.split('_')[0])
                              .map(item =>
                              <ListItem
                                key={item}
                                label={
                                  item === 'pnl'
                                    ? 'Profit / Loss'
                                    : item[0].toUpperCase() + item.slice(1)
                                }
                                value={`${state.aggregations[`${item}_${currency}`]} ${currency}`}
                                textType={
                                  item === 'dividend'
                                    ? 'success'
                                    : item === 'pnl'
                                      ? state.aggregations[`${item}_${currency}`] > 0
                                        ? 'success' : 'danger'
                                      : item === 'sell'
                                        ? 'warning'
                                        : item === 'active'
                                          ? 'info'
                                          : 'primary'
                                }
                                className="mr-3"
                              />)
                          }
                          {
                            state.aggregations[`pnl_${currency}`] && state.aggregations[`dividend_${currency}`]
                              ? <ListItem
                                  label={"Profit"}
                                  value={`${state.aggregations[`pnl_${currency}`] + state.aggregations[`dividend_${currency}`]} ${currency}`}
                                  textType={
                                    state.aggregations[`pnl_${currency}`] + state.aggregations[`dividend_${currency}`] > 0
                                      ? 'success': 'danger'
                                  }
                                  className="mr-3"
                                />
                              : null
                          }
                        </div>)
                      : null}
                  </div>
                : null
            }
          </div>
        </div>
      </div>
    </div>

    {/* Last Transaction */}
    <div className="row mt-2">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Last Transaction</h6>
            {
              state.loading
                ? <Circles width="100%" height="50" />
                : state.results?.length
                  ? <Marquee duration={10000} pauseOnHover >
                    <ListItem label={"Date"} value={formatTime(state.results[0].date)} textType={"warning"} className="mr-3" />
                    <ListItem label={"Type"} value={state.types.find(t => t[0] === state.results[0].type)[1]} textType={"warning"} className="mr-3" />
                    {state.results[0].quantity && <ListItem label={"Quantity"} value={state.results[0].quantity} textType={"warning"} className="mr-3" />}
                    {state.results[0].ticker && <ListItem label={"Ticker"} value={state.results[0].ticker} textType={"warning"} className="mr-3" />}
                    {state.results[0].price && <ListItem label={"Price"} value={state.results[0].price} textType={"warning"} className="mr-3" />}
                    {state.results[0].net && <ListItem label={"Net"} value={
                      `${state.results[0].net} ${state.results[0].currency ? state.results[0].currency : ''}`
                    } textType={"warning"} className="mr-3" />}
                    {/*{state.results[0].commission && <ListItem label={"Commission"} value={state.results[0].commission} textType={"warning"} className="mr-3" />}*/}
                    {/*{state.results[0].tax && <ListItem label={"Tax"} value={state.results[0].tax} textType={"success"} className="mr-3" />}*/}
                    {state.results[0].interest && <ListItem label={"Interest"} value={state.results[0].interest} textType={"success"} className="mr-3" />}
                    {state.results[0].interest_dates && <ListItem label={"Interest Dates"} value={state.results[0].interest_dates.map(d => formatDate(d)).join(", ")} textType={"success"} className="mr-3" />}
                    {/*{state.results[0].maturity && <ListItem label={"Maturity"} value={new Date(state.results[0].date).toLocaleString()} textType={"warning"} className="mr-3" />}*/}
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Transactions table */}
    <div className="row">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              {state.modalOpen ? null : <Errors errors={state.errors}/>}
            </h4>
            <div className="table-responsive">

              {/* Title and filters */}
              <div className="mb-0 text-muted">
                <div className="row">

                  {/* Title and small buttons */}
                  <div className="col-sm-6">
                    <h6 className="text-secondary">
                      Transactions: {state.count}
                      <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent"
                              onClick={() => dispatch(api.getList(state.kwargs))}>
                        <i className="mdi mdi-refresh" />
                      </button>
                      <button
                        type="button"
                        className="ml-0 p-0 btn btn-outline-primary btn-sm border-0 bg-transparent"
                        onClick={() => dispatch(setModalOpen(true))}
                      >
                        <i className="mdi mdi-plus" />
                      </button>
                    </h6>
                    <div className="form-check">
                      <label htmlFor="" className="form-check-label">
                        <input
                            className="checkbox"
                            type="checkbox"
                            checked={activeOnlyChecked}
                            onChange={onActiveOnlyChange}
                        />Active only <i className="input-helper"/>
                      </label>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="col-sm-6">
                    <Form
                      className="row float-right"
                      onSubmit={e => {
                        e.preventDefault();
                        dispatch(api.getList(state.kwargs));
                      }}
                    >
                      <Form.Group className="col-md-6">
                        <Form.Label>Type</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={state.loading}
                          isLoading={state.loading}
                          isMulti
                          onChange={e => onChange('type', e, state)}
                          options={state.types?.map(t => ({ label: t[1], value: t[0] }))}
                          styles={selectStyles}
                          value={state.kwargs.type?.map(t => ({
                            label: state.types.find(ty => ty[0] === t)[1],
                            value: t
                          }))}
                        />
                      </Form.Group>
                      <Form.Group className="col-md-6">
                        <Form.Label>Ticker</Form.Label>&nbsp;
                        <Select
                          id={"stocksTickerSelect"}
                          closeMenuOnSelect={false}
                          isDisabled={state.loading}
                          isLoading={state.loading}
                          isMulti
                          onChange={(e) => onChange('ticker', e, state)}
                          options={state.tickers?.map(t => ({ label: t, value: t }))}
                          styles={selectStyles}
                          value={state.kwargs.ticker?.map(t => ({ label: t, value: t }))}
                        />
                      </Form.Group>
                    </Form>
                  </div>

                </div>
              </div>

              {/* Table */}
              <table className="table table-hover">
                <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Ticker</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Net</th>
                  <th>Interest</th>
                  {/*<th>Commission</th>*/}
                  {/*<th>Tax</th>*/}
                  <th>Profit</th>
                  <th>Maturity</th>
                  <th>Notes</th>
                </tr>
                </thead>
                <tbody>
                {
                  state.loading
                    ? <Circles
                      visible
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{ float: "right" }}
                      color='orange'
                    />
                    : state.results?.length
                      ? state.results.map(bond =>
                        <tr
                          key={bond.id}
                          className="cursor-pointer"
                          onClick={() => dispatch(selectItem(bond.id))}
                        >
                          <td> {formatTime(bond.date)} </td>
                          <td>{state.types?.find(t => t[0] === bond.type)[1]}</td>
                          <td> {bond.ticker} </td>
                          <td> {parseFloat(bond.quantity)} </td>
                          <td> {bond.price ? parseFloat(bond.price) : '-'} </td>
                          <td
                            className={
                              `text-${
                                bond.net > 0
                                  ? bond.type === 'in' ? 'primary' : 'success'
                                  : bond.type === 'cump'
                                    ? 'info'
                                    : 'danger'
                              }`
                            }
                          >
                            {parseFloat(bond.net)}
                          </td>
                          <td>
                            {
                              bond.interest
                                ? <span>
                                    <span className={bond.interest ? "text-success" : ''}>
                                      {parseFloat(bond.interest / 100 * -bond.net).toFixed(2)}&nbsp;
                                      {bond.currency}&nbsp;
                                    </span>
                                    ({bond.interest}%)
                                  </span>
                                : '-'
                            }
                          </td>
                          {/*<td> {parseFloat(bond.commission)} </td>*/}
                          {/*<td> {bond.tax ? parseFloat(bond.tax): '-'} </td>*/}
                          <td className={`text-${bond.pnl ? bond.pnl < 0 ? 'danger' : 'success' : 'muted'}`}>
                            {bond.pnl ? parseFloat(bond.pnl): '-'}
                          </td>
                          <td>
                            {bond.interest_dates.map(r => <div>{formatDate(r)}</div>)}
                          </td>
                          <td> {bond.notes ? bond.notes: '-'} </td>
                        </tr>)
                      : <tr>
                        <td colSpan={6}><span>No transactions found</span></td>
                      </tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={state} fetchMethod={api.getList} newApi={true} setKwargs={setKwargs} />

          </div>
        </div>
      </div>
    </div>

    {/* Add or Edit Modal */}
    <Modal centered show={Boolean(state.selectedItem) || state.modalOpen} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card">
              {state.selectedItem ? 'Edit' : 'Add new transaction'} {state.selectedItem?.ticker} ?
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent"
                      onClick={() => dispatch(api.getItem(state.selectedItem?.id))}>
                <i className="mdi mdi-refresh" />
              </button>
            </div>

          </div>
          {
            state.selectedItem
              ? <p className="text-muted mb-0">{state.selectedItem.ticker}</p>
              : <p className="text-muted mb-0">Fill in the bond transaction details</p>
          }
          {state.modalOpen ? <Errors errors={state.errors} /> : null}

        </Modal.Title>
      </Modal.Header>
      {
        state.loadingItems?.includes(state.selectedItem?.id)
        ? <ColorRing
            width = "100%"
            height = "50"
            wrapperStyle={{width: "100%"}}
          />
        : <Modal.Body>
        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Date</Form.Label>
            <div>
              <DatePicker
                className="btn btn-outline-secondary rounded btn-sm"
                dateFormat={'dd MMM yyyy HH:mm'}
                isClearable={false}
                onChange={date => setDate(date)}
                readOnly={state.loading}
                scrollableYearDropdown
                selected={date}
                showIcon
                showYearDropdown
                showTimeInput
                showTimeSelect
                timeFormat="HH:mm"
              />
            </div>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Maturity</Form.Label>
            <div>
              {
                interestDates?.map(
                  (d, index) => <div key={`mat-${index}`}>
                    <DatePicker
                      className="btn btn-outline-secondary rounded btn-sm"
                      dateFormat={'dd MMM yyyy'}
                      isClearable={false}
                      onChange={maturity => setInterestDates(interestDates.map(
                        (i, id) => id !== index ? i : maturity
                      ))}
                      readOnly={state.loading}
                      scrollableYearDropdown
                      selected={interestDates[index]}
                      showIcon
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm border-0 bg-transparent"
                      onClick={
                        () => setInterestDates(
                          interestDates.filter((d, id) => id !== index)
                        )}
                    >
                      <i className="mdi mdi-delete" />
                    </button>
                  </div>
                )
              }
              <button
                type="button"
                className="btn btn-outline-primary btn-sm border-0 bg-transparent"
                onClick={
                  () => setInterestDates(
                    interestDates
                      ? [...interestDates, new Date()]
                      : [new Date()])}
              >
                add date +
              </button>
            </div>
          </Form.Group>
          <Form.Group className="col-md-4">
            <Form.Label>Type</Form.Label>&nbsp;
            <Select
              isDisabled={state.loading}
              isLoading={state.loading}
              onChange={e => setType(
                ({ label: state.types.find(t => t[0] === e.value)[1] ,value: e.value })
              )}
              options={state.types?.map(t => ({ label: t[1], value: t[0] }))}
              styles={selectStyles}
              value={type}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Ticker</Form.Label>
            <Form.Control
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Quantity</Form.Label>
            <Form.Control
              type="text"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Price</Form.Label>
            <Form.Control
              type="text"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Net</Form.Label>
            <Form.Control
              type="text"
              value={net}
              onChange={e => setNet(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Currency</Form.Label>
            <Form.Control
              type="text"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Interest</Form.Label>
            <Form.Control
              type="text"
              value={interest}
              onChange={e => setInterest(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Profit</Form.Label>
            <Form.Control
              type="text"
              value={pnl}
              onChange={e => setPnl(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </Form.Group>
          <button type="submit" hidden />
        </Form>
      </Modal.Body>
      }
      <Modal.Footer>
        {
          Boolean(state.selectedItem)
            ? <Button
                variant="danger"
                className="float-left"
                onClick={() => dispatch(api.delete(state.selectedItem.id, `${state.selectedItem.date} / ${state.selectedItem.ticker}`))}
              >
                Delete
              </Button>
            : null
        }

        <Button variant="secondary" onClick={closeModal}>Close</Button>
        <Button variant="primary" onClick={onSubmit}>
          {state.selectedItem ? "Update" : "Add"}
        </Button>
      </Modal.Footer>
    </Modal>
  </div>
}

export default Bonds;