import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Audio } from 'react-loader-spinner';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import Errors from '../shared/Errors';
import FavoritesApi from '../../api/favorites';
import { setKwargs } from '../../redux/eventsSlice';
import { setFavoritesFilter } from '../../redux/favoritesSlice';

const FavoritesManager = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const favorites = useSelector((s) => s.favorites) || {};
  const token = useSelector((s) => s.auth.token);

  const api = new FavoritesApi(token);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editExternalId, setEditExternalId] = useState('');

  const [input, setInput] = useState('');
  const [url, setUrl] = useState('');

  /** Creates a favorite from the current form values. */
  async function onAdd(e) {
    e?.preventDefault?.();
    const name = (input || '').trim();
    if (!name || !url) return;
    try {
      setAdding(true);
      await dispatch(api.create({ name, type: 'band', url }));
      setInput('');
      setUrl('');
    } finally {
      setAdding(false);
    }
  }

  /** Opens the inline editor for a favorite item. */
  function startEdit(item) {
    setEditing(item.id);
    setEditName(item.name);
    setEditExternalId(item.external_id);
  }

  /** Saves the trimmed inline edit without changing the external id. */
  function saveEdit(item) {
    const name = (editName || '').trim();
    if (!name && !editExternalId) {
      setEditing(null);
      return;
    }

    if (item.name === name && item.external_id === editExternalId) {
      setEditing(null);
      return;
    }
    dispatch(api.update(item.id, { name, external_id: editExternalId }));
    setEditing(null);
  }

  useEffect(() => {
    if (token && !favorites.results) dispatch(api.getList({ type: 'band' }));
  }, [token]);

  return (
    <div className='card'>
      <div className='card-body'>
        <h4 className='card-title'>
          Manage favorite bands
          <button
            type='button'
            className='btn btn-outline-success btn-sm border-0 bg-transparent'
            onClick={() => dispatch(api.getList(favorites.kwargs))}
          >
            <i className='mdi mdi-refresh' />
          </button>
          <sup>
            <a href='/events' className='small ml-2'>
              [back to events]
            </a>
          </sup>
          <sup>
            <a href='/sources' className='small ml-2'>
              [sources]
            </a>
          </sup>
        </h4>

        <Errors errors={favorites.errors} />
        <Form onSubmit={onAdd} className='d-flex mb-3'>
          <Form.Control
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Name'
            className='mr-2'
          />
          <Form.Control
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder='URL'
            className='mr-2'
          />
          <Button variant='primary' onClick={onAdd} disabled={adding}>
            {adding ? 'Adding…' : 'Add'}
          </Button>
        </Form>

        <div className='table-responsive table-hover'>
          <table className='table'>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {favorites.loading ? (
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
              ) : (favorites.results || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className='text-muted'>
                    No favorite bands yet
                  </td>
                </tr>
              ) : (
                (favorites.results || []).map((item) => (
                  <tr key={item.id || item.name} className='align-items-center'>
                    <td>
                      {(favorites.results || []).findIndex(
                        (row) => (row.id || row.name) === (item.id || item.name)
                      ) + 1}
                    </td>
                    <td>
                      {editing === item.id ? (
                        <Form.Control
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <button
                          type='button'
                          className='btn btn-link p-0'
                          onClick={() => {
                            dispatch(
                              setKwargs({ favorites: [item.name], page: 1 })
                            );
                            dispatch(setFavoritesFilter(true));
                            history.push('/events');
                          }}
                        >
                          {item.name}
                        </button>
                      )}
                    </td>
                    <td>
                      {editing === item.id ? (
                        <>
                          <Button
                            size='sm'
                            variant='primary'
                            onClick={() => saveEdit(item)}
                            className='mr-2'
                          >
                            Save
                          </Button>
                          <Button
                            size='sm'
                            variant='outline-secondary'
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size='sm'
                            variant='outline-primary'
                            onClick={() => startEdit(item)}
                            className='mr-2'
                          >
                            Edit
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FavoritesManager;
