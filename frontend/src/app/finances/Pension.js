import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import Button from 'react-bootstrap/Button';
import DatePicker from 'react-datepicker/es';
import Form from "react-bootstrap/Form";
import ListItem from "../shared/ListItem";
import Modal from 'react-bootstrap/Modal';
import { Circles, ColorRing } from 'react-loader-spinner';
import "nouislider/distribute/nouislider.css";
import "react-datepicker/dist/react-datepicker.css";

import BottomPagination from "../shared/BottomPagination";
import Errors from "../shared/Errors";
import { selectItem, setKwargs, setModalOpen } from "../../redux/pensionSlice";
import { PensionApi } from '../../api/finance';
import { Collapse } from 'react-bootstrap';

const Pension = () => {
  const dispatch = useDispatch();
  const pension = useSelector(state => state.pension)
  const token = useSelector((state) => state.auth.token)

  const api = new PensionApi(token)

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(new Date())
  const [totalUnits, setTotalUnits] = useState(0)

  const [contribModalOpen, setContribModalOpen] = useState(null)

  const [contribAmount, setContribAmount] = useState(0)
  const [contribDate, setContribDate] = useState(new Date())
  const [contribUnits, setContribUnits] = useState(0)
  const [editing, setEditing] = useState(null)

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

  const onUpdateUnits = (pensionId, contributionId) => {
    setEditing(null);
    dispatch(api.updateContributionUnits(pensionId, contributionId, contribUnits))
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
  }

  useEffect(() => {
    if (pension.selectedItem) {
      setName(pension.selectedItem.name)
      setStartDate(new Date(pension.selectedItem.start_date))
      setTotalUnits(pension.selectedItem.total_units)
    }
    return clearModal
  }, [pension.selectedItem])

  useEffect(() => {
    if (!pension.results?.length) dispatch(api.getList(pension.kwargs))
  }, [])

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Pension
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(api.getList(pension.kwargs))}
        >
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item active" aria-current="page">Pension</li>
        </ol>
      </nav>
    </div>

    {/* Top cards */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Funds
              <button
                type="button"
                className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                onClick={() => dispatch(setModalOpen(true))}
              >
                <i className="mdi mdi-plus" />
              </button>
            </h6>
            <div className={"row"}>
              {
                pension.loading
                  ? <Circles height={20} width={20} wrapperStyle={{ display: 'default' }} wrapperClass="btn" />
                  : pension.results?.length
                    ? pension.results.map(p => <div className="col-lg-6 col-xl-3 grid-margin" key={`pension-${p.id}`}>
                      <div className="card-body">
                        <h6>
                          {p.name}
                          {
                            p.unit_values?.length
                              ? <p className={"text-muted"}>
                                  Last update: {new Date(p.unit_values[0].date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}<br/>
                                  Unit value: {p.unit_values[0].value}
                                </p>
                              : ''
                          }
                          <button
                            type="button"
                            className="float-right btn btn-xs btn-outline-warning btn-icon pl-1 border-0"
                            onClick={() => dispatch(selectItem(p.id))}
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                        </h6>
                        <div style={{ maxHeight: '22vh', overflowY: 'scroll' }}>
                          <ListItem
                            label={'Started'}
                            value={new Date(p.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            textType={'warning'}
                          />
                          <ListItem
                            label={'Units bought'}
                            value={
                              p.contributions?.map(c => c.units).reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue), 0).toFixed(6)
                            }
                            textType={'warning'}
                          />
                          <ListItem
                            label={'Net Units'}
                            value={`${p.total_units} ${p.contributions?.length ? ` (${(p.total_units - p.contributions?.map(c => c.units).reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue), 0)).toFixed(2)})` : ''}`}
                            textType={'warning'}
                          />
                          <ListItem
                            label={'Contributions'}
                            value={p.contributions?.length ? `${p.contributions?.map(c => c.amount).reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue), 0)} ${p.contributions[0].currency} (${p.contributions.length})` : '-'}
                            textType={'warning'}
                          />
                          <ListItem
                            label={'Net'}
                            value={
                              (parseFloat(p.unit_values?.[0]?.value || 0) * (p.total_units || 0)).toFixed(2) + ` ${p.contributions?.[0]?.currency || ''} ${p.contributions?.length ? ` (${(parseFloat(p.unit_values?.[0]?.value || 0) * (p.total_units || 0) - p.contributions?.map(c => c.amount).reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue), 0)).toFixed(2)})` : ''}`
                          }
                            textType={'warning'}
                          />
                        </div>
                      </div>
                    </div>)
                    : <small className="text-muted">No pension funds</small>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    {pension.modalOpen ? null : <Errors errors={pension.errors}/>}
    {/* Transactions */}
    <div className="row">
    {
      pension.results?.map(p =>
          <div className="col-12 grid-margin" key={`pension-transactions-${p.id}`}>
            <div className="card">
              <div className="card-body">
                <div className="table-responsive">
                  <div className="mb-0 text-muted">
                    <div className="row">
                      <div className="col-sm-12">
                        <h6 className="text-secondary">
                          {p.name}
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm border-0 bg-transparent"
                            onClick={() => dispatch(api.getList(pension.kwargs))}
                          >
                            <i className="mdi mdi-refresh" />
                          </button>
                          <button
                            type="button"
                            className="ml-0 p-0 btn btn-outline-primary btn-sm border-0 bg-transparent"
                            onClick={() => setContribModalOpen(contribModalOpen === p.id ? null : p.id)}
                          >
                            <i className="mdi mdi-plus" />
                          </button>
                          <p className={'text-muted'}>Total: {p.contributions?.length}</p>
                        </h6>
                        <Collapse in={contribModalOpen === p.id}>
                          <ul className="navbar-nav w-100 rounded">
                            <li className="nav-item w-100">
                              <Form onSubmit={e => onSubmitContrib(e, p.id)}>
                                <div className="row">
                                  <div className="col-md-4">
                                    <Form.Group className="row">
                                      <span className="col-sm-4 col-form-label">Amount</span>
                                      <div className="col-sm-8">
                                        <Form.Control
                                          type="text"
                                          value={contribAmount}
                                          onChange={e => setContribAmount(e.target.value)}
                                        />
                                      </div>
                                    </Form.Group>
                                  </div>
                                  <div className="col-md-4">
                                    <Form.Group className="row">
                                      <span className="col-sm-4 col-form-label">Units</span>
                                      <div className="col-sm-8">
                                        <Form.Control
                                          type="text"
                                          value={contribUnits}
                                          onChange={e => setContribUnits(e.target.value)}
                                        />
                                      </div>
                                    </Form.Group>
                                  </div>
                                  <div className="col-md-4">
                                    <Form.Group className="row">
                                      <div className="col-sm-9 mw-100">
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
                                      </div>
                                    </Form.Group>
                                  </div>
                                </div>
                                <Button
                                  hidden={true}
                                  type={"submit"}
                                  variant="primary"
                                  onClick={e => onSubmitContrib(e, p.id)}
                                  disabled={!contribDate || !contribAmount}
                                >
                                  Add
                                </Button>
                              </Form>
                            </li>
                          </ul>
                        </Collapse>
                      </div>
                    </div>
                  </div>
                  <table className="table table-hover">
                    <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Units</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                      pension.loading
                        ? <Circles
                          visible
                          width="100%"
                          ariaLabel="ball-triangle-loading"
                          wrapperStyle={{ float: 'right' }}
                          color="orange"
                        />
                        : p.contributions?.length
                          ? p.contributions.map(c => <tr key={`pension-${p.id}-${c.id}`}>
                            <td> {new Date(c.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })} </td>
                            <td> {c.amount} {c.currency}</td>
                            <td onClick={() => setEditing(c.id)}>
                              {
                                editing === c.id
                                  ? <input
                                      type="text"
                                      value={contribUnits}
                                      onChange={(e) => setContribUnits(e.target.value)}
                                      onBlur={() => onUpdateUnits(p.id, c.id)}
                                      onKeyDown={e => e.key === "Enter" ? onUpdateUnits(p.id, c.id) : null}
                                      autoFocus
                                    />
                                  : c.units
                              }
                            </td>
                            <td>
                              <i
                                className="cursor-pointer mdi mdi-sync-alert text-warning"
                                onClick={() => dispatch(api.syncContributionUnits(p.id, c.id))}
                              />
                            </td>
                          </tr>)
                          : <tr>
                            <td colSpan={6}><span>No contributions found</span></td>
                          </tr>
                    }
                    </tbody>
                  </table>
                </div>
                <BottomPagination items={pension} fetchMethod={api.getList} newApi={true} setKwargs={setKwargs} />

              </div>
            </div>
        </div>,
      )
    }
    </div>
    <Modal centered show={Boolean(pension.selectedItem) || pension.modalOpen} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card">
              {pension.selectedItem ? 'Edit' : 'Add new device'} {pension.selectedItem?.name} ?
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
          <Button variant="danger" className="float-left" onClick={() => dispatch(api.delete(pension.selectedItem.id))}>
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