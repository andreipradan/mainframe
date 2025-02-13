import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import Button from 'react-bootstrap/Button';
import DatePicker from 'react-datepicker/es';
import Form from "react-bootstrap/Form";
import Modal from 'react-bootstrap/Modal';
import { Circles, ColorRing } from 'react-loader-spinner';
import "react-datepicker/dist/react-datepicker.css";

import Errors from "../../shared/Errors";
import ListItem from "../../shared/ListItem";
import { selectItem, setModalOpen } from "../../../redux/pensionSlice";
import { PensionApi } from '../../../api/finance';

export const getEvaluation = (p, justValue = false) => {
  const evaluation = parseFloat(p.latest_unit_value || 0) * (p.total_units || 0)
  if (justValue) return evaluation
  return <span>{evaluation.toFixed(2)} {p.contributions?.[0]?.currency}</span>
}
export const getPnl = (p, justValue = false) => {
  const pnl = parseFloat(p.latest_unit_value || 0) *
    (p.total_units || 0) -
    p.contributions?.map(c => c.amount).reduce((accumulator, currentValue) =>
      accumulator + parseFloat(currentValue), 0
  )
  if (justValue) return pnl
  return <span className={`text-${pnl > 0 ? 'success' : pnl === 0 ? 'muted' : 'danger'}`}>{pnl.toFixed(2)} {p.contributions?.[0]?.currency}</span>
}

const Pension = () => {
  const dispatch = useDispatch();
  const pension = useSelector(state => state.pension)
  const token = useSelector((state) => state.auth.token)

  const api = new PensionApi(token)

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(new Date())
  const [totalUnits, setTotalUnits] = useState(0)

  const [pensionOpen, setPensionOpen] = useState(null)

  const [contribAddOpen, setContribAddOpen] = useState(false)

  const [contribAmount, setContribAmount] = useState(0)
  const [contribDate, setContribDate] = useState(new Date())
  const [contribUnits, setContribUnits] = useState(0)
  const [editing, setEditing] = useState("")

  const clearModal = () => {
    setName("")
    setStartDate(new Date())
    setTotalUnits(0)
  }
  const closeModal = () => {
    dispatch(selectItem())
    dispatch(setModalOpen(false))
    clearModal()
  }

  const onAddContribution = () => {
    if (!contribAddOpen) {
      setEditing(null);
      setContribDate(new Date())
      setContribAmount(0)
      setContribUnits(0)
    }
    setContribAddOpen(!contribAddOpen)
  }
  const onEditContribution = (c) => {
    setContribAmount(c.amount)
    setContribDate(new Date(c.date))
    setContribUnits(c.units)
    setEditing(c.id);
    setContribAddOpen(false)
  }

  const onUpdateContribution = (pensionId, contributionId) => {
    dispatch(api.updateContribution(
      pensionId,
      contributionId,
      {
        amount: contribAmount,
        date: contribDate.toISOString().split("T")[0],
        units: contribUnits
      }
    ))
    setEditing("")
  }

  const onSubmit = e => {
    e.preventDefault();
    const data = {
      name,
      start_date: startDate.toISOString().split("T")[0],
      total_units: totalUnits,
    }
    if (pension.selectedItem) dispatch(api.update(pension.selectedItem.id, data))
    else dispatch(api.create(data))
  }

  const onSubmitContrib = (e, pensionId) => {
    e.preventDefault()
    const data = {
      amount: contribAmount,
      date: contribDate.toISOString().split("T")[0],
      units: contribUnits,
    }
    dispatch(api.createContribution(pensionId, data))
    setContribAddOpen(false)
  }

  useEffect(() => {
    if (!pensionOpen || !pension.results) return

    const pensionOpenChanged = pension.results.find(p => p.id === pensionOpen.id)
    if (pensionOpenChanged) setPensionOpen(pensionOpenChanged)
  }, [pensionOpen, pension.results]);

  useEffect(() => {
    if (pension.selectedItem) {
      setName(pension.selectedItem.name)
      setStartDate(new Date(pension.selectedItem.start_date))
      setTotalUnits(pension.selectedItem.total_units)
    }
    return clearModal
  }, [pension.selectedItem])

  useEffect(() => {
    if (!pension.results?.length)
      dispatch(api.getList(pension.kwargs))
  }, [])

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Pension funds
        {
          pension.loading
          ? <Circles height={15} width={15} wrapperStyle={{ display: 'default' }} wrapperClass="btn" />
          : <>
              <button type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent p-1"
                onClick={() => dispatch(api.getList(pension.kwargs))}
              >
                <i className="mdi mdi-refresh" />
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm border-0 bg-transparent p-0"
                onClick={() => dispatch(setModalOpen(true))}
              >
                <i className="mdi mdi-plus-circle-outline "/>
              </button>
            </>
        }
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item active" aria-current="page">Pension</li>
        </ol>
      </nav>
    </div>
    <b className={"text-small text-muted"}>
      <div>
        Total: {
          pension.results?.map(p => getEvaluation(p, true)).reduce((accumulator, currentValue) =>
            accumulator + parseFloat(currentValue), 0
          ).toFixed(2)
        } {pension.results?.[0].contributions?.[0]?.currency}
      </div>
      <div className={"mb-1"}>
        PnL: {
          pension.results?.map(p => getPnl(p, true)).reduce((acc, val) => acc + parseFloat(val), 0).toFixed(2)
        } {pension.results?.[0].contributions?.[0]?.currency}
      </div>
    </b>

    {/* Top cards */}
    <div className="row">
    {
      pension.results?.map(p =>
        <div className={`col-${pensionOpen === p.id ? 12 : 12 / pension.count} grid-margin`} key={`pension-transactions-${p.id}`}>
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <h6 className="text-secondary">
                  {p.name}
                  {
                    pension.loadingItems?.includes(p.id)
                      ? <Circles height={20} width={20} wrapperStyle={{display: "default"}} wrapperClass="btn"/>
                      : <>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm border-0 bg-transparent p-1"
                            onClick={() => dispatch(api.getItem(p.id))}
                          >
                            <i className="mdi mdi-refresh" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-warning btn-sm border-0 bg-transparent p-0"
                            onClick={() => dispatch(selectItem(p.id))}
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                        </>
                  }
                  <div className={'text-muted'}>
                    {
                      p.latest_unit_value_date
                        ? <p className={"text-muted mb-0 text-small"}>
                            Last update: {new Date(p.latest_unit_value_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}<br/>
                          </p>
                        : null
                    }
                    {
                      p.latest_unit_value
                        ? <p className={"text-muted text-small"}>
                            Last value: {p.latest_unit_value}
                          </p>
                        : null
                    }
                  </div>

                  {/* Pension fund details */}
                  <div style={{ maxHeight: '22vh', overflowY: 'scroll' }}>
                    <ListItem
                      label={'Started'}
                      value={new Date(p.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      textType={'primary'}
                    />
                    <ListItem
                      label={'Units'}
                      value={p.total_units}
                    />
                    <ListItem
                      label={'Evaluation'}
                      value={getEvaluation(p)}
                      textType={'success'}
                    />
                    <ListItem label={'Profit / Loss'} value={getPnl(p)} />
                  </div>
                </h6>
                <button
                  type={"button"}
                  className={`ml-2 btn btn-sm btn-rounded btn-outline-${pensionOpen?.id === p.id ? 'info' : 'primary'}`}
                  onClick={() => setPensionOpen(pensionOpen?.id === p.id ? null : p)}
                >
                  {pensionOpen?.id === p.id ? 'Deselect' : 'Select'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    </div>
    {pension.modalOpen ? null : <Errors errors={pension.errors}/>}

    {/* Contributions table */}
    <div className="row">
      <div className={`col-12 grid-margin`}>
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <h6 className="text-secondary">
                {
                  pensionOpen
                    ? <span>{pensionOpen.name}</span>
                    : null
                }
                {
                  pensionOpen
                    ? <button
                        type="button"
                        className="btn btn-outline-primary btn-sm border-0 bg-transparent"
                        onClick={onAddContribution}
                      >
                        <i className="mdi mdi-plus" />
                      </button>
                    : null
                }
              </h6>
              <div className={"sticky-table"}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>
                        Amount{
                          pensionOpen
                            ? <sup>{pensionOpen.contributions?.map(c => c.amount)
                              .reduce((accumulator, currentValue) =>
                                accumulator + parseFloat(currentValue), 0
                              ).toFixed(3)}</sup>
                            : null
                        }
                      </th>
                      <th>
                        Units{
                          pensionOpen
                            ? <sup>{pensionOpen.contributions?.map(c => c.units)
                              .reduce((accumulator, currentValue) =>
                                accumulator + parseFloat(currentValue), 0
                              ).toFixed(3)}</sup>
                            : null
                        }
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {
                        pensionOpen && contribAddOpen
                          ? <>
                              <td>{'<'}new{'>'}</td>
                              <td>
                                <DatePicker
                                  className="btn btn-outline-secondary rounded btn-sm"
                                  dateFormat={'MMM yyyy'}
                                  isClearable={false}
                                  onChange={date => setContribDate(date)}
                                  readOnly={pension.loading}
                                  scrollableYearDropdown
                                  selected={contribDate}
                                  showIcon
                                  showYearDropdown
                                  showMonthYearPicker
                                />
                              </td>
                              <td>
                                <input
                                  autoFocus
                                  onChange={(e) => setContribAmount(e.target.value)}
                                  type="text"
                                  value={contribAmount}
                                />
                              </td>
                              <td>
                                <input
                                  autoFocus
                                  onChange={(e) => setContribUnits(e.target.value)}
                                  type="text"
                                  value={contribUnits}
                                />
                              </td>
                              <td>
                                {
                                  contribAddOpen
                                    ? <>
                                        <i
                                          className="cursor-pointer mdi mdi-cancel text-danger mr-2"
                                          onClick={() => setContribAddOpen(false)}
                                        />
                                        <i
                                          className="cursor-pointer mdi mdi-check text-success mr-2"
                                          onClick={(e) => onSubmitContrib(e, pensionOpen.id)}
                                        />
                                      </>
                                    : null
                                }
                              </td>
                            </>
                          : null
                      }

                    </tr>

                    {
                      pension.loading || pension.loadingItems?.includes(pensionOpen?.id)
                        ? <tr><td><Circles
                            visible
                            width="100%"
                            ariaLabel="ball-triangle-loading"
                            wrapperStyle={{ float: 'right' }}
                            color="orange"
                          /></td></tr>
                        : pensionOpen
                          ? pensionOpen.contributions.map((c, i) =>
                            <tr key={`contrib-${c.id}`}>
                              <td>{i + 1}</td>
                              <td>
                                {
                                  editing === c.id
                                    ? <div>
                                        <DatePicker
                                          className="btn btn-outline-secondary rounded btn-sm"
                                          dateFormat={'MMM yyyy'}
                                          isClearable={false}
                                          onChange={date => setContribDate(date)}
                                          readOnly={pension.loading}
                                          scrollableYearDropdown
                                          selected={contribDate}
                                          showIcon
                                          showYearDropdown
                                          showMonthYearPicker
                                          onClickOutside={() => setContribDate(null)}
                                        />
                                      </div>
                                    : new Date(c.date).toLocaleDateString('en-US', {year: 'numeric', month: 'long'})
                                }

                              </td>
                              <td>
                                {
                                  editing === c.id
                                    ? <input
                                        autoFocus
                                        onChange={(e) => setContribAmount(e.target.value)}
                                        type="text"
                                        value={contribAmount}
                                      />
                                    : <span>{c.amount} {c.currency}</span>
                                }
                              </td>
                              <td>
                                {
                                  editing === c.id
                                    ? <input
                                        autoFocus
                                        onChange={(e) => setContribUnits(e.target.value)}
                                        type="text"
                                        value={contribUnits}
                                      />
                                    : <span>{c.units}</span>
                                }
                              </td>
                              <td>
                                {
                                  editing === c.id
                                    ? <>
                                        <i
                                          className="cursor-pointer mdi mdi-cancel text-danger mr-2"
                                          onClick={() => setEditing("")}
                                        />
                                        <i
                                          className="cursor-pointer mdi mdi-check text-success mr-2"
                                          onClick={() => onUpdateContribution(pensionOpen.id, c.id)}
                                        />
                                      </>
                                    : <i
                                        className="cursor-pointer mdi mdi-pencil text-warning mr-2"
                                        onClick={() => onEditContribution(c)}
                                      />
                                }
                                <i
                                  className="cursor-pointer mdi mdi-delete text-danger"
                                  onClick={() => dispatch(api.deleteContribution(
                                    pensionOpen.id,
                                    c.id,
                                    `${pensionOpen.name} for ${new Date(c.date).toLocaleDateString(
                                      "en-US",
                                      {month: "short", year: "numeric"}
                                    )}`))}
                                />
                              </td>
                            </tr>)
                          : <tr><td colSpan={4} className={"text-center"}>Please select a pension fund</td></tr>
                    }
                  </tbody>
                </table>
              </div>
              {
                pensionOpen
                  ? <b className={"text-small text-secondary"}>Total: {pensionOpen?.contributions?.length || 0}</b>
                  : null
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Add / edit pension Modal */}
    <Modal centered show={Boolean(pension.selectedItem) || pension.modalOpen} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card">
              {pension.selectedItem ? 'Edit' : 'Add new pension fund'} {pension.selectedItem?.name} ?
            </div>
          </div>
          {
            pension.selectedItem
              ? <p className="text-muted mb-0">
                {pension.selectedItem.employer}
              </p>
              : null
          }
          {pension.modalOpen ? <Errors errors={pension.errors} /> : null}

        </Modal.Title>
      </Modal.Header>
      {
        pension.loadingItems?.includes(pension.selectedItem?.id)
          ? <ColorRing
            width="100%"
            height="50"
            wrapperStyle={{ width: '100%' }}
          />
          : <Modal.Body>
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Pension fund name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Start date</Form.Label>
                <div>
                  <DatePicker
                    className="btn btn-outline-secondary rounded btn-sm"
                    dateFormat={'dd-MM-yyyy'}
                    isClearable={false}
                    onChange={date => setStartDate(date)}
                    readOnly={pension.loading}
                    scrollableYearDropdown
                    selected={startDate}
                    showIcon
                    showYearDropdown
                  />
                </div>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Total Units</Form.Label>
                <Form.Control
                  type="text"
                  value={totalUnits}
                  onChange={e => setTotalUnits(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
      }
      <Modal.Footer>
        {
          Boolean(pension.selectedItem) &&
          <Button variant="danger" className="float-left" onClick={() => dispatch(api.delete(pension.selectedItem.id, pension.selectedItem.name))}>
            Delete
          </Button>
        }

        <Button variant="secondary" onClick={closeModal}>
          Close
        </Button>
        <Button
          variant="primary"
        onClick={onSubmit}
        disabled={!name || !startDate || !totalUnits}
      >
        {pension.selectedItem ? "Update" : "Add"}
      </Button>
    </Modal.Footer>
  </Modal>
  </div>
}

export default Pension;