import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import Marquee from "react-fast-marquee";
import BottomPagination from "../../shared/BottomPagination";
import Form from "react-bootstrap/Form";
import Select from "react-select";
import { Circles, ColorRing } from 'react-loader-spinner';
import "react-datepicker/dist/react-datepicker.css";

import Errors from "../../shared/Errors";
import ListItem from "../../shared/ListItem";
import { selectItem, setKwargs, setModalOpen } from "../../../redux/depositsSlice";
import { selectStyles } from "../Accounts/Categorize/EditModal";
import { DepositsApi } from '../../../api/finance';
import { formatDate, formatTime } from '../../earthquakes/Earthquakes';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import DatePicker from 'react-datepicker';
import { useHistory } from 'react-router-dom';

const diffMonths = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const years = d2.getFullYear() - d1.getFullYear();
  const months = d2.getMonth() - d1.getMonth();
  return years * 12 + months;
}

const getGrossInterest = (amount, interest, date, maturity) => {
  const interestPerMonth = interest / 100 * amount / 12
  const months = diffMonths(date, maturity)
  return (interestPerMonth * months).toFixed(2)
}

const Deposits = () => {
  const dispatch = useDispatch();
  const history = useHistory()

  const state = useSelector(state => state.deposits)
  const token = useSelector((state) => state.auth.token)

  const api = new DepositsApi(token)

  const [alias, setAlias] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(null)
  const [date, setDate] = useState(null)
  const [interest, setInterest] = useState("")
  const [maturity, setMaturity] = useState(null)
  const [name, setName] = useState("")
  const [pnl, setPnl] = useState("")
  const [tax, setTax] = useState("")

  const clearModal = () => {
    setAlias("")
    setAmount("")
    setCurrency(null)
    setDate(null)
    setInterest("")
    setMaturity(null)
    setName("")
    setPnl("")
    setTax("")
  }
  const closeModal = () => {
    dispatch(selectItem())
    dispatch(setModalOpen(false))
    clearModal()
  }

  const onChange = (what, newValue, store) => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({...(store.kwargs || {}), [what]: newTypes, page: 1}))
  }

  const onSubmit = e => {
    e.preventDefault()
    if (!date || !maturity || !amount || !interest || !name || !currency) {
      alert('Fill in all the required fields');
      return;
    }
    const data = {
      alias,
      amount,
      currency: currency ? currency.value : null,
      date: date.toISOString().split("T")[0],
      interest,
      name,
    }
    if (maturity) data.maturity = maturity.toISOString().split("T")[0]
    if (pnl) data.pnl = pnl
    if (tax) data.tax = tax
    if (state.selectedItem)
      dispatch(api.update(state.selectedItem.id, data))
    else {
      dispatch(api.create(data));
      clearModal()
    }
  }

  useEffect(() => {
    if (state.selectedItem) {
      setAlias(state.selectedItem.alias)
      setAmount(state.selectedItem.amount)
      setCurrency(
        ({
          label: state.selectedItem.currency,
          value: state.selectedItem.currency
        })
      )
      setDate(new Date(state.selectedItem.date))
      setInterest(state.selectedItem.interest)
      if (state.selectedItem.maturity)
        setMaturity(new Date(state.selectedItem.maturity))
      setName(state.selectedItem.name)
      setPnl(state.selectedItem.pnl)
      setTax(state.selectedItem.tax)
    }
  }, [state.currencies, state.selectedItem]);

  return <div>
    {/* Top title and breadcrumbs */}
    <div className="page-header mb-0">
      <h3 className="page-title">
        Deposits
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
          <li className="breadcrumb-item active" aria-current="page">Deposits</li>
        </ol>
      </nav>
    </div>

    {
      state.loading
        ? <Circles
            height={20}
            width={20}
            wrapperStyle={{ display: 'default' }}
            wrapperClass="btn"
          />
        : <b className={"text-small text-muted"}>
            <div>Count: {state.count}</div>
            Active:
            <ul className={"list-arrow"}>
              {
                state.currencies?.map(currency => <li
                  className={"pt-0"}>{state.aggregations[currency]} {currency}</li>)
              }
            </ul>
          </b>
    }

    <Errors errors={state.errors}/>

    {/* Next maturity */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Next Maturity</h6>
            {
              state.loading
                ? <Circles width="100%" height="50" />
                : state.results?.length
                  ? <Marquee duration={10000} pauseOnHover >
                    {state.results[0].name && <ListItem label={"Name"} value={state.results[0].name} textType={"warning"} className="mr-3" />}
                    <ListItem label={"Date"} value={formatTime(state.results[0].date)} textType={"warning"} className="mr-3" />
                    {state.results[0].amount && <ListItem label={"Quantity"} value={state.results[0].amount} textType={"warning"} className="mr-3" />}
                    <ListItem label={"Currency"} value={state.currencies?.find(c => c[0] === state.results[0].currency)?.[1] || state.results[0].currency} textType={"warning"} className="mr-3" />
                    {state.results[0].interest && <ListItem label={"Interest"} value={state.results[0].interest} textType={"warning"} className="mr-3" />}
                    <ListItem label={"Maturity"} value={formatTime(state.results[0].maturity)} textType={"warning"} className="mr-3" />
                    {state.results[0].pnl && <ListItem label={"Profit"} value={state.results[0].pnl} textType={"warning"} className="mr-3" />}
                    {state.results[0].tax && <ListItem label={"Tax"} value={state.results[0].tax} textType={"warning"} className="mr-3" />}
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>

    {/* Deposits table */}
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
                      Deposits: {state.results?.length} / {state.count}
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
                      <Form.Group className="col-md-12">
                        <Form.Label>Currency</Form.Label>&nbsp;
                        <Select
                          closeMenuOnSelect={false}
                          isDisabled={state.loading}
                          isLoading={state.loading}
                          isMulti
                          onChange={e => onChange('currency', e, state)}
                          options={state.currencies?.map(t => ({ label: t, value: t }))}
                          styles={selectStyles}
                          value={state.kwargs.currency?.map(t => ({
                            label: t,
                            value: t
                          }))}
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
                  <th>Maturity</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Interest</th>
                  <th>Tax <sup>10%</sup></th>
                  <th>Profit</th>
                  <th>Name</th>
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
                      ? state.results.map(deposit =>
                        <tr
                          key={deposit.id}
                          className="cursor-pointer"
                          onClick={() => dispatch(selectItem(deposit.id))}
                        >
                          <td>
                            {formatDate(deposit.maturity)}&nbsp;
                            {
                              new Date(deposit.maturity) < new Date()
                                ? <i className={"text-success mdi mdi-check-circle-outline"}/>
                                : null
                            }
                            <br/><sub>{diffMonths(deposit.date, deposit.maturity)} months</sub>
                          </td>
                          <td>{formatDate(deposit.date)}</td>
                          <td className={"text-warning"}> {parseFloat(deposit.amount)} {deposit.currency}</td>
                          <td>
                            <span className={"text-success"}>
                              {getGrossInterest(deposit.amount, deposit.interest, deposit.date, deposit.maturity)}&nbsp;
                              {deposit.currency}&nbsp;
                            </span>
                            <sup>{deposit.interest}%</sup>
                          </td>
                          <td>
                            <span className='text-danger'>
                              {(getGrossInterest(deposit.amount, deposit.interest, deposit.date, deposit.maturity) / 10).toFixed(2)} {deposit.currency}
                            </span>
                          </td>
                          <td
                            className={`text-${new Date(deposit.maturity) <= new Date() ? 'success' : 'warning'}`}>
                            {(getGrossInterest(deposit.amount, deposit.interest, deposit.date, deposit.maturity) - getGrossInterest(deposit.amount, deposit.interest, deposit.date, deposit.maturity) / 10).toFixed(2)} {deposit.currency}
                          </td>
                          <td> {deposit.name} </td>
                        </tr>)
                      : <tr>
                        <td colSpan={6}><span>No deposits found</span></td>
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
              {state.selectedItem ? 'Edit' : 'Add new deposit'} {state.selectedItem?.ticker} ?
              {
                state.selectedItem
                  ? <button
                      type="button"
                      className="btn btn-outline-success btn-sm border-0 bg-transparent"
                      onClick={() => dispatch(api.getItem(state.selectedItem?.id))}
                    >
                      <i className="mdi mdi-refresh" />
                    </button>
                  : null
              }
            </div>

          </div>
          {
            state.selectedItem
              ? <p className="text-muted mb-0">{state.selectedItem.ticker}</p>
              : <p className="text-muted mb-0">Fill in the deposit details</p>
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
                dateFormat={'dd MMM yyyy'}
                isClearable={false}
                onChange={date => setDate(date)}
                readOnly={state.loading}
                scrollableYearDropdown
                selected={date}
                showIcon
                showYearDropdown
              />
            </div>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Maturity</Form.Label>
            <div>
              <DatePicker
                className="btn btn-outline-secondary rounded btn-sm"
                dateFormat={'dd MMM yyyy'}
                isClearable={false}
                onChange={maturity => setMaturity(maturity)}
                readOnly={state.loading}
                scrollableYearDropdown
                selected={maturity}
                showIcon
                // showYearDropdown
                // showMonthYearPicker
              />
            </div>
          </Form.Group>
          <Form.Group className="col-md-4">
            <Form.Label>Currency</Form.Label>&nbsp;
            <Select
              isDisabled={state.loading}
              isLoading={state.loading}
              onChange={e => setCurrency(
                ({ label: e.value, value: e.value })
              )}
              options={state.currencies?.map(t => ({ label: t, value: t }))}
              styles={selectStyles}
              value={currency}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Amount</Form.Label>
            <Form.Control
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value)}
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
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Tax</Form.Label>
            <Form.Control
              type="text"
              value={tax}
              onChange={e => setTax(e.target.value)}
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
        <Button variant="primary" onClick={onSubmit} disabled={!date || !maturity || !amount || !interest || !name || !currency}>
          {state.selectedItem ? "Update" : "Add"}
        </Button>
      </Modal.Footer>
    </Modal>
  </div>
}

export default Deposits;