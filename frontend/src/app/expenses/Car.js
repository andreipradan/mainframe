import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import Button from 'react-bootstrap/Button';
import DatePicker from 'react-datepicker/es';
import Form from "react-bootstrap/Form";
import ListItem from "../shared/ListItem";
import Modal from 'react-bootstrap/Modal';
import { Circles, ColorRing } from 'react-loader-spinner';
import "react-datepicker/dist/react-datepicker.css";

import BottomPagination from "../shared/BottomPagination";
import Errors from "../shared/Errors";
import { selectItem, setKwargs, setModalOpen } from "../../redux/carSlice";
import { CarApi } from '../../api/expenses';
import { Collapse } from 'react-bootstrap';

const Car = () => {
  const dispatch = useDispatch();
  const store = useSelector(state => state.car)
  const token = useSelector((state) => state.auth.token)

  const api = new CarApi(token)

  const [name, setName] = useState('')

  const [serviceEntryModalOpen, setServiceEntryModalOpen] = useState(false)

  const [serviceEntryDate, setServiceEntryDate] = useState(new Date())
  const [serviceEntryDescription, setServiceEntryDescription] = useState("")
  const [serviceEntryPrice, setServiceEntryPrice] = useState("")

  const clearModal = () => {
    setName("")
  }
  const closeModal = () => {
    dispatch(selectItem())
    dispatch(setModalOpen(false))
    clearModal()
  }

  const onSubmit = useCallback(e => {
    e.preventDefault()
    const data = {name}
    if (store.selectedItem)
      dispatch(api.update(store.selectedItem.id, data))
    else
      dispatch(api.create(data))
  }, [api, dispatch, name, store.selectedItem])

  const onSubmitServiceEntry = (e, parentId) => {
    e.preventDefault()
    const data = {
      date: serviceEntryDate.toISOString().split('T')[0],
      description: serviceEntryDescription,
      price: serviceEntryPrice,
    }
    dispatch(api.createServiceEntry(parentId, data))
  }

  useEffect(() => {
    if (!store.results?.length) dispatch(api.getList())
  }, [])

  useEffect(() => {
    if (store.selectedItem) {
      setName(store.selectedItem.name)
    }
  }, [store.selectedItem])

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Car expenses
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(api.getList(store.kwargs))}
        >
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Expenses</a></li>
          <li className="breadcrumb-item active" aria-current="page">Car</li>
        </ol>
      </nav>
    </div>

    {/* Top cards */}
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>
              Cars
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
                store.loading
                  ? <Circles height={20} width={20} wrapperStyle={{ display: 'default' }} wrapperClass="btn" />
                  : store.results?.length
                    ? store.results.map(p => <div className="col grid-margin" key={`car-${p.id}`}>
                      <h6>
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
                          label={'Name'}
                          value={p.name}
                          textType={'warning'}
                        />
                        <ListItem
                          label={'Service entries'}
                          value={p.service_entries?.length || 0}
                          textType={'warning'}
                        />
                        <ListItem
                          label={'Total spent'}
                          value={p.service_entries?.length ? p.service_entries.map(p => p.price).reduce((acc, val) => acc + parseFloat(val), 0).toFixed(2) : 0}
                          textType={'warning'}
                        />
                        <ListItem
                          label={'Last serviced'}
                          value={
                            p.service_entries?.length
                              ? new Date(p.service_entries[0].date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : "No entries."
                          }
                          textType={'warning'}
                        />
                      </div>
                    </div>)
                    : <small className="text-muted">No cars added</small>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    {store.modalOpen ? null : <Errors errors={store.errors}/>}
    {/* Transactions */}
    <div className="row">
    {
      store.results?.map(p =>
          <div className="col-12 grid-margin" key={`car-service-entry-${p.id}`}>
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
                            onClick={() => dispatch(api.getList(store.kwargs))}
                          >
                            <i className="mdi mdi-refresh" />
                          </button>
                          <button
                            type="button"
                            className="ml-0 p-0 btn btn-outline-primary btn-sm border-0 bg-transparent"
                            onClick={() => setServiceEntryModalOpen(serviceEntryModalOpen === p.id ? null : p.id)}
                          >
                            <i className="mdi mdi-plus" />
                          </button>
                          <p className={'text-muted'}>
                            Service entries: {p.service_entries?.length || 0}<br/>
                            Total spent: {p.service_entries?.length ? p.service_entries.map(p => p.price).reduce((acc, val) => acc + parseFloat(val), 0).toFixed(2) : 0}
                          </p>
                        </h6>
                        <Collapse in={serviceEntryModalOpen === p.id}>
                          <ul className="navbar-nav w-100 rounded">
                            <li className="nav-item w-100">
                              <Form onSubmit={e => onSubmitServiceEntry(e, p.id)}>
                                <div className="row">
                                  <div className="col-md-4">
                                    <Form.Group className="row">
                                      <span className="col-sm-4 col-form-label">Price</span>
                                      <div className="col-sm-8">
                                        <Form.Control
                                          type="text"
                                          value={serviceEntryPrice}
                                          onChange={e => setServiceEntryPrice(e.target.value)}
                                        />
                                      </div>
                                    </Form.Group>
                                  </div>
                                  <div className="col-md-4">
                                    <Form.Group className="row">
                                      <span className="col-sm-4 col-form-label">Description</span>
                                      <div className="col-sm-8">
                                        <Form.Control
                                          type="text"
                                          value={serviceEntryDescription}
                                          onChange={e => setServiceEntryDescription(e.target.value)}
                                        />
                                      </div>
                                    </Form.Group>
                                  </div>
                                  <div className="col-md-4">
                                    <Form.Group className="row">
                                      <div className="col-sm-9 mw-100">
                                        <DatePicker
                                          className="btn btn-outline-secondary rounded btn-sm"
                                          dateFormat={'dd MMM yyyy'}
                                          isClearable={false}
                                          onChange={date => setServiceEntryDate(date)}
                                          readOnly={store.loading}
                                          scrollableYearDropdown
                                          selected={serviceEntryDate}
                                          showIcon
                                          showYearDropdown
                                        />
                                      </div>
                                    </Form.Group>
                                  </div>
                                </div>
                                <Button
                                  hidden={true}
                                  type={"submit"}
                                  variant="primary"
                                  onClick={e => onSubmitServiceEntry(e, p.id)}
                                  disabled={!serviceEntryDate || !serviceEntryPrice}
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
                      <th>Price</th>
                      <th>Description</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                      store.loading
                        ? <Circles
                          visible
                          width="100%"
                          ariaLabel="ball-triangle-loading"
                          wrapperStyle={{ float: 'right' }}
                          color="orange"
                        />
                        : p.service_entries?.length
                          ? p.service_entries.map(c => <tr key={`service-entry-${p.id}-${c.id}`}>
                            <td> {new Date(c.date).toLocaleDateString('en-US', { year: 'numeric', month: "short", day: "numeric" })} </td>
                            <td> {c.price} {c.currency}</td>
                            <td>
                              {c.description}
                            </td>
                            <td>
                              <i
                                className="cursor-pointer mdi mdi-trash-can-outline text-warning"
                                onClick={() => dispatch(api.deleteServiceEntry(p.id, c.id))}
                              />
                            </td>
                          </tr>)
                          : <tr>
                            <td colSpan={6}><span>No service entries found</span></td>
                          </tr>
                    }
                    </tbody>
                  </table>
                </div>
                <BottomPagination items={store} fetchMethod={api.getList} newApi={true} setKwargs={setKwargs} />

              </div>
            </div>
        </div>,
      )
    }
    </div>
    <Modal centered show={Boolean(store.selectedItem) || store.modalOpen} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card">
              {store.selectedItem ? 'Edit' : 'Add new'} {store.selectedItem?.name} ?
            </div>
          </div>
          {
            store.selectedItem
              ? <p className="text-muted mb-0">{store.selectedItem.employer}</p>
              : null
          }
          {store.modalOpen ? <Errors errors={store.errors} /> : null}

        </Modal.Title>
      </Modal.Header>
      {
        store.loadingItems?.includes(store.selectedItem?.id)
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
            </Form>
          </Modal.Body>
      }
      <Modal.Footer>
        {
          Boolean(store.selectedItem) &&
          <Button
            variant="danger"
            className="float-left"
            onClick={() => dispatch(api.delete(store.selectedItem.id, store.selectedItem.name))}
          >
            Delete
          </Button>
        }

        <Button variant="secondary" onClick={closeModal}>
          Close
        </Button>
        <Button
          variant="primary"
        onClick={onSubmit}
        disabled={!name}
      >
        {store.selectedItem ? "Update" : "Add"}
      </Button>
    </Modal.Footer>
  </Modal>
  </div>
}

export default Car;