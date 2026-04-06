import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Audio } from 'react-loader-spinner';
import AceEditor from 'react-ace';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import BottomPagination from '../shared/BottomPagination';
import EventsApi from '../../api/events';
import Errors from '../shared/Errors';
import { selectItem, setKwargs, setModalOpen } from '../../redux/eventsSlice';
import { selectStyles } from '../finances/Accounts/Categorize/EditModal';
import Select from 'react-select';
import { formatTime } from '../earthquakes/Earthquakes';

import 'ace-builds';
import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const fromDateTimeLocal = (value) =>
  value ? new Date(value).toISOString() : null;

const Events = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const events = useSelector((state) => state.events);
  const { results, errors, loading, count, selectedItem, modalOpen } = events;

  const [filtered, setFiltered] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('');
  const [externalId, setExternalId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [additionalData, setAdditionalData] = useState(null);
  const [additionalDataAnnotations, setAdditionalDataAnnotations] =
    useState(null);

  const api = new EventsApi(token);

  const closeModal = () => {
    dispatch(selectItem());
    dispatch(setModalOpen(false));
  };

  const onAdditionalDataChange = (e, i) => {
    setAdditionalData(e);
    try {
      JSON.parse(e);
      setAdditionalDataAnnotations(null);
    } catch (error) {
      const annotation = { ...i.end, text: error.message, type: 'error' };
      setAdditionalDataAnnotations(
        !additionalDataAnnotations
          ? [annotation]
          : [...additionalDataAnnotations, annotation]
      );
    }
  };
  const onCityChange = (e) => {
    dispatch(setKwargs({ city: e.target.value }));
  };

  const onCategoryChange = (newValue) => {
    const newTypes = newValue.map((v) => v.value);
    dispatch(setKwargs({ category: newTypes, page: 1 }));
  };

  useEffect(() => {
    setFiltered(
      results?.filter((item) =>
        ['title', 'location', 'source'].some((key) =>
          item[key]
            ?.toString()
            ?.toLowerCase()
            ?.includes(searchTerm.toLowerCase())
        )
      ) ?? []
    );
  }, [results, searchTerm]);

  useEffect(() => {
    if (selectedItem) {
      setTitle(selectedItem.title || '');
      setDescription(selectedItem.description || '');
      setLocation(selectedItem.location || '');
      setSource(selectedItem.source || '');
      setExternalId(selectedItem.external_id || '');
      setStartDate(toDateTimeLocal(selectedItem.start_date));
      setEndDate(toDateTimeLocal(selectedItem.end_date));
      setAdditionalData(
        JSON.stringify(selectedItem.additional_data, null, '\t')
      );

      dispatch(setModalOpen(true));
    }
  }, [selectedItem]);

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title,
      description,
      location,
      source,
      external_id: externalId,
      start_date: fromDateTimeLocal(startDate),
      end_date: fromDateTimeLocal(endDate),
    };
    if (additionalData) {
      payload.additional_data = JSON.parse(
        additionalData.replace(/[\r\n\t]/g, '')
      );
    }

    if (selectedItem) {
      dispatch(api.update(selectedItem.id, payload));
    } else {
      dispatch(api.create(payload));
    }
    closeModal();
  };

  const onEdit = (item) => {
    dispatch(selectItem(item.id));
  };

  const onDelete = (item) => {
    dispatch(api.delete(item.id, item.title));
  };

  return (
    <div>
      <div className='page-header'>
        <h3 className='page-title'>Events</h3>
        <nav aria-label='breadcrumb'>
          <ol className='breadcrumb'>
            <li className='breadcrumb-item'>
              <a href='!#' onClick={(event) => event.preventDefault()}>
                Home
              </a>
            </li>
            <li className='breadcrumb-item active' aria-current='page'>
              Events
            </li>
          </ol>
        </nav>
      </div>

      <div className='row'>
        <div className='col-lg-12 grid-margin stretch-card'>
          <div className='card'>
            <div className='card-body'>
              <h4 className='card-title'>
                Event list
                <button
                  type='button'
                  className='btn btn-outline-success btn-sm border-0 bg-transparent'
                  onClick={() => dispatch(api.getList(events.kwargs))}
                >
                  <i className='mdi mdi-refresh' />
                </button>
                <button
                  type='button'
                  className='float-right btn btn-outline-primary btn-rounded btn-icon pl-1'
                  onClick={() => {
                    clearModalForm();
                    dispatch(selectItem());
                    dispatch(setModalOpen(true));
                  }}
                >
                  <i className='mdi mdi-plus' />
                </button>
                <p className='text-small text-muted'>Total: {count}</p>
              </h4>

              <Errors errors={errors} />

              <div className='row mb-3'>
                <div className='col-md-6'>
                  <Form.Group>
                    <Form.Label>City</Form.Label>
                    <Form.Control
                      as='select'
                      value={events.kwargs.city}
                      onChange={onCityChange}
                    >
                      <option value=''>All Cities</option>
                      {events.cities?.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                </div>
                <div className='col-md-6'>
                  <Form.Group className='col-md-12'>
                    <Form.Label>Categories</Form.Label>&nbsp;
                    <Select
                      closeMenuOnSelect={false}
                      isDisabled={events.loading}
                      isLoading={events.loading}
                      isMulti
                      onChange={onCategoryChange}
                      options={events.categories?.map((t) => ({
                        label: t,
                        value: t,
                      }))}
                      styles={selectStyles}
                      value={events.kwargs.category?.map((t) => ({
                        label: t,
                        value: t,
                      }))}
                    />
                  </Form.Group>
                </div>
              </div>

              <div className='form-group mb-3'>
                <input
                  className='form-control'
                  placeholder='Search events'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className='table-responsive table-hover'>
                <table className='table'>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Source</th>
                      <td>City</td>
                      <th>Location</th>
                      <th>Categories</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading ? (
                      (filtered || []).length ? (
                        (filtered || []).map((event, index) => (
                          <tr key={event.id || index}>
                            <td>{index + 1}</td>
                            <td
                              className='cursor-pointer'
                              onClick={() => dispatch(selectItem(event.id))}
                            >
                              <span className='text-primary'>
                                {event.title}
                              </span>
                              &nbsp;
                              <br />
                              <small>
                                Starts: {formatTime(event.start_date)}
                              </small>
                              <br />
                              {event.end_date ? (
                                <small>
                                  Ends: {formatTime(event.end_date)}
                                </small>
                              ) : null}
                            </td>
                            <td>
                              <a
                                href={event.url}
                                target='_blank'
                                rel='noopener noreferrer'
                              >
                                {event.source_name}&nbsp;
                                <i className='mdi mdi mdi-link-variant' />
                              </a>
                            </td>
                            <td>{event.city}</td>
                            <td>
                              {event.location_url ? (
                                <a
                                  href={event.location_url}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                >
                                  {event.location}
                                </a>
                              ) : (
                                event.location
                              )}
                            </td>
                            <td>
                              {event.categories?.map((c) => (
                                <button
                                  key={c.toString()}
                                  disabled={events.kwargs.category?.includes(c)}
                                  className={'btn btn-sm text-secondary'}
                                  onClick={() =>
                                    dispatch(
                                      setKwargs({
                                        category: [
                                          ...new Set([
                                            ...(events.kwargs.category || []),
                                            c,
                                          ]),
                                        ],
                                        page: 1,
                                      })
                                    )
                                  }
                                >
                                  {c}{' '}
                                </button>
                              ))}
                            </td>
                            <td>
                              <Button
                                size='sm'
                                variant='outline-primary'
                                className='mr-2'
                                onClick={() => onEdit(event)}
                              >
                                Edit
                              </Button>
                              <Button
                                size='sm'
                                variant='outline-danger'
                                onClick={() => onDelete(event)}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className='text-center'>
                            No events available
                          </td>
                        </tr>
                      )
                    ) : (
                      <tr>
                        <td colSpan={8}>
                          <Audio
                            width='100%'
                            radius='9'
                            color='green'
                            wrapperStyle={{ width: '100%' }}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <BottomPagination
                items={events}
                fetchMethod={api.getList}
                newApi={true}
                setKwargs={setKwargs}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        centered
        show={Boolean(selectedItem) || modalOpen}
        onHide={closeModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedItem ? 'Edit event' : 'Create event'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={onSubmit}>
            <Errors errors={errors} />
            <Form.Group className='mb-3'>
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as='textarea'
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Location</Form.Label>
              <Form.Control
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Source</Form.Label>
              <Form.Control
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>External ID</Form.Label>
              <Form.Control
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Start date</Form.Label>
              <Form.Control
                type='datetime-local'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>End date</Form.Label>
              <Form.Control
                type='datetime-local'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Additional data</Form.Label>
              <AceEditor
                className={
                  additionalDataAnnotations ? 'form-control is-invalid' : ''
                }
                annotations={additionalDataAnnotations}
                placeholder='AdditionalData'
                mode='python'
                theme='monokai'
                onChange={onAdditionalDataChange}
                fontSize={12}
                showPrintMargin
                showGutter
                highlightActiveLine
                value={additionalData}
                setOptions={{
                  enableBasicAutocompletion: false,
                  enableLiveAutocompletion: false,
                  enableSnippets: false,
                  showLineNumbers: true,
                  tabSize: 2,
                }}
                width='100%'
                height='150px'
              />
            </Form.Group>
            <div className='d-flex justify-content-end'>
              <Button variant='secondary' onClick={closeModal} className='mr-2'>
                Cancel
              </Button>
              <Button variant='primary' type='submit'>
                {selectedItem ? 'Update' : 'Create'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Events;
