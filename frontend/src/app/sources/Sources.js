import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Audio, ColorRing } from 'react-loader-spinner';
import AceEditor from 'react-ace';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Select from 'react-select';

import 'ace-builds';
import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

import BottomPagination from '../shared/BottomPagination';
import Errors from '../shared/Errors';
import SourcesApi from '../../api/sources';
import { selectItem, setKwargs, setModalOpen } from '../../redux/sourcesSlice';
import { selectStyles } from '../finances/Accounts/Categorize/EditModal';

const Sources = () => {
  const dispatch = useDispatch();
  const sources = useSelector((state) => state.sources);
  const token = useSelector((state) => state.auth.token);

  const api = new SourcesApi(token);

  const [config, setConfig] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [headers, setHeaders] = useState(null);
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [url, setUrl] = useState('');

  const [configAnnotations, setConfigAnnotations] = useState(null);
  const [headersAnnotations, setHeadersAnnotations] = useState(null);

  const clearModal = () => {
    setConfig(null);
    setIsActive(false);
    setHeaders(null);
    setName('');
    setSourceType('');
    setUrl('');
  };
  const closeModal = () => {
    dispatch(selectItem());
    dispatch(setModalOpen(false));
    clearModal();
  };

  const onConfigChange = (e, i) => {
    setConfig(e);
    try {
      JSON.parse(e);
      setConfigAnnotations(null);
    } catch (error) {
      const annotation = { ...i.end, text: error.message, type: 'error' };
      setConfigAnnotations(
        !configAnnotations ? [annotation] : [...configAnnotations, annotation]
      );
    }
  };

  const onHeadersChange = (e, i) => {
    setHeaders(e);
    try {
      JSON.parse(e);
      setHeadersAnnotations(null);
    } catch (error) {
      const annotation = { ...i.end, text: error.message, type: 'error' };
      setHeadersAnnotations(
        !headersAnnotations ? [annotation] : [...headersAnnotations, annotation]
      );
    }
  };
  const onSubmit = (e) => {
    e.preventDefault();
    const data = {
      is_active: isActive,
      name,
      type: sourceType[0],
      url,
    };
    if (config) data.config = JSON.parse(config.replace(/[\r\n\t]/g, ''));
    if (headers) data.headers = JSON.parse(headers.replace(/[\r\n\t]/g, ''));
    if (sources.selectedItem)
      dispatch(api.update(sources.selectedItem.id, data));
    else dispatch(api.create(data));
  };
  useEffect(() => {
    if (sources.selectedItem) {
      setConfig(JSON.stringify(sources.selectedItem.config, null, '\t'));
      setIsActive(sources.selectedItem.is_active);
      setHeaders(JSON.stringify(sources.selectedItem.headers, null, '\t'));
      setName(sources.selectedItem.name);
      setSourceType(
        sources.types?.find((t) => t[0] === sources.selectedItem.type)
      );
      setUrl(sources.selectedItem.url);
    }
  }, [sources.selectedItem]);
  return (
    <div>
      <div className='page-header'>
        <h3 className='page-title'>Sources</h3>
        <nav aria-label='breadcrumb'>
          <ol className='breadcrumb'>
            <li className='breadcrumb-item'>
              <span>Home</span>
            </li>
            <li className='breadcrumb-item active' aria-current='page'>
              Sources
            </li>
          </ol>
        </nav>
      </div>
      <div className='row'>
        <div className='col-lg-12 grid-margin stretch-card'>
          <div className='card'>
            <div className='card-body'>
              <Errors errors={sources.errors} />
              <div className='table-responsive'>
                <div className='mb-0 text-muted'>
                  <div className='row'>
                    <div className='col-sm-12'>
                      <h4 className='text-secondary'>
                        Sources
                        <button
                          type='button'
                          className='btn btn-outline-success btn-sm border-0 bg-transparent'
                          onClick={() => dispatch(api.getList(sources.kwargs))}
                        >
                          <i className='mdi mdi-refresh' />
                        </button>
                        <sup>
                          <a href='/events/favorites' className='small ml-2'>
                            [bands]
                          </a>
                        </sup>
                        <button
                          type='button'
                          className='float-right btn btn-outline-primary btn-rounded btn-icon pl-1'
                          onClick={() => dispatch(setModalOpen(true))}
                        >
                          <i className='mdi mdi-plus' />
                        </button>
                        <p className='text-small text-muted'>
                          Total: {sources.count}
                        </p>
                      </h4>
                    </div>
                  </div>
                </div>
                <table className='table table-hover'>
                  <thead>
                    <tr>
                      <th> #</th>
                      <th> Name</th>
                      <th> URL </th>
                      <th> Type </th>
                      <th> Is Active? </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!sources.loading ? (
                      sources.results?.length ? (
                        sources.results.map((s, i) =>
                          !sources.loadingItems?.includes(s.id) ? (
                            <tr
                              key={s.id}
                              className='cursor-pointer'
                              onClick={() => dispatch(selectItem(s.id))}
                            >
                              <td>{i + 1}</td>
                              <td>{s.name}</td>
                              <td>{s.url}</td>
                              <td>
                                {
                                  sources.types?.find(
                                    (t) => t[0] === s.type
                                  )?.[1]
                                }
                              </td>
                              <td>
                                <i
                                  className={`mdi mdi-${s.is_active ? 'check text-success' : 'alert text-danger'}`}
                                />
                              </td>
                            </tr>
                          ) : (
                            <tr key={i}>
                              <td colSpan={6}>
                                <ColorRing
                                  width='100%'
                                  height='50'
                                  wrapperStyle={{ width: '100%' }}
                                />
                              </td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>
                          <td colSpan={6} className={'text-center'}>
                            No sources available
                          </td>
                        </tr>
                      )
                    ) : (
                      <tr>
                        <td colSpan={6}>
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
                <BottomPagination
                  items={sources}
                  fetchMethod={api.getList}
                  newApi
                  setKwargs={setKwargs}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        centered
        show={Boolean(sources.selectedItem) || sources.modalOpen}
        onHide={() => dispatch(closeModal)}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {sources.selectedItem ? 'Edit' : 'Add new'}&nbsp; source
            {sources.selectedItem && (
              <>
                <p className='text-muted mb-0'>
                  Created:{' '}
                  {new Date(sources.selectedItem.created_at).toLocaleString()}
                </p>
                <p className='text-muted mb-0'>
                  Updated:{' '}
                  {new Date(sources.selectedItem.updated_at).toLocaleString()}
                </p>
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        {(sources.selectedItem &&
          sources.loadingItems?.includes(sources.selectedItem?.id)) ||
        sources.loading ? (
          <ColorRing
            width='100%'
            height='50'
            wrapperStyle={{ width: '100%' }}
          />
        ) : (
          <Modal.Body>
            <Form onSubmit={onSubmit}>
              <Errors errors={sources.errors} />
              <Form.Group className='mb-3'>
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type='text'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className='mb-3'>
                <Form.Label>Is Active?</Form.Label>
                <Form.Check
                  checked={isActive}
                  type='switch'
                  id='checkbox'
                  label=''
                  onChange={() => {
                    setIsActive(!isActive);
                  }}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Type</Form.Label>
                <Select
                  placeholder={'Type'}
                  value={{ label: sourceType?.[1], value: sourceType?.[0] }}
                  onChange={(sourceType) => {
                    setSourceType(
                      sources.types.find((t) => t[0] === sourceType.value)
                    );
                  }}
                  options={sources.types?.map((u) => ({
                    label: u[1],
                    value: u[0],
                  }))}
                  styles={selectStyles}
                  closeMenuOnSelect
                />
              </Form.Group>
              <Form.Group className='mb-3'>
                <Form.Label>URL</Form.Label>
                <Form.Control
                  type='text'
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Form.Group>
              <Form.Group className='mb-3'>
                <Form.Label>Config</Form.Label>
                <AceEditor
                  className={configAnnotations ? 'form-control is-invalid' : ''}
                  annotations={configAnnotations}
                  placeholder='Config'
                  mode='python'
                  theme='monokai'
                  onChange={onConfigChange}
                  fontSize={12}
                  showPrintMargin
                  showGutter
                  highlightActiveLine
                  value={config}
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
              <Form.Group className='mb-3'>
                <Form.Label>Headers</Form.Label>
                <AceEditor
                  className={
                    headersAnnotations ? 'form-control is-invalid' : ''
                  }
                  annotations={headersAnnotations}
                  placeholder='Headers'
                  mode='python'
                  theme='monokai'
                  onChange={onHeadersChange}
                  fontSize={12}
                  showPrintMargin
                  showGutter
                  highlightActiveLine
                  value={headers}
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
            </Form>
          </Modal.Body>
        )}
        <Modal.Footer>
          {sources.selectedItem && (
            <Button
              variant='danger'
              className='float-left'
              onClick={() =>
                dispatch(
                  api.delete(sources.selectedItem.id, sources.selectedItem.name)
                )
              }
            >
              Delete
            </Button>
          )}
          <Button variant='secondary' onClick={closeModal}>
            Close
          </Button>
          <Button
            disabled={sources.selectedItem ? false : !name || !url}
            onClick={onSubmit}
            variant='primary'
          >
            {sources.selectedItem ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Sources;
