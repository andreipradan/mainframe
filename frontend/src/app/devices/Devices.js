import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Audio, Circles } from 'react-loader-spinner';
import { Collapse } from 'react-bootstrap';

import DevicesApi from '../../api/devices';
import EditModal from './EditModal';
import Errors from '../shared/Errors';
import { selectItem, setModalOpen } from '../../redux/devicesSlice';

const Devices = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const { results, errors, loading, loadingItems, count, modalOpen } =
    useSelector((state) => state.devices);

  const api = new DevicesApi(token);

  const [devices, setDevices] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState(null);

  /** Returns devices matching the current search term. */
  function search() {
    return results.filter((d) =>
      ['ip', 'mac', 'name'].some((key) =>
        d[key]?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }

  /** Builds the sort control for a device table column. */
  function getSortingComponent(column, heading) {
    const currentSort = sorting?.find((s) => s.startsWith(`${column}-`));
    let sortOrder = 'unsorted';
    if (currentSort?.endsWith('-asc')) {
      sortOrder = 'ascending';
    } else if (currentSort?.endsWith('-desc')) {
      sortOrder = 'descending';
    }

    let sortingClass = 'cursor-pointer mdi mdi-sort-alphabetical';
    if (sorting?.includes(`${column}-asc`)) {
      sortingClass += '-ascending';
    } else if (sorting?.includes(`${column}-desc`)) {
      sortingClass += '-descending';
    }

    /** Advances this column through ascending, descending, and unsorted. */
    const updateSorting = () => {
      const hasSorting = sorting?.find((s) => s.startsWith(`${column}-`));
      if (!hasSorting) {
        setSorting(sorting ? [...sorting, `${column}-asc`] : [`${column}-asc`]);
      } else if (hasSorting === `${column}-asc`) {
        setSorting(
          sorting.map((s) => (s === `${column}-asc` ? `${column}-desc` : s))
        );
      } else if (hasSorting === `${column}-desc`) {
        setSorting(sorting.filter((s) => s !== `${column}-desc`));
      }
    };

    return (
      <>
        <button
          type='button'
          className='btn btn-link p-0'
          aria-label={`Sort by ${heading}, currently ${sortOrder}`}
          onClick={updateSorting}
        >
          <i className={sortingClass} aria-hidden='true' />
        </button>
        {sorting?.find((s) => s.startsWith(`${column}-`)) && (
          <sup>{sorting.findIndex((s) => s.startsWith(`${column}-`)) + 1}</sup>
        )}
      </>
    );
  }

  /** Renders the loading, empty, or populated device table rows. */
  function getDeviceRows() {
    if (loading) {
      return (
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
      );
    }

    if (!devices?.length) {
      return (
        <tr>
          <td colSpan={6}>No devices available</td>
        </tr>
      );
    }

    return devices.map((device) => (
      <tr
        key={device.id}
        onClick={() => dispatch(selectItem(device.id))}
        className='cursor-pointer'
      >
        <td>{devices.findIndex((row) => row.id === device.id) + 1}</td>
        <td className='row'>
          {device.display_name || '-'}
          {loadingItems?.includes(device.id) ? (
            <Circles
              visible
              height='15'
              width='100%'
              wrapperClass='pl-2'
              color='green'
            />
          ) : null}
          {!device.should_notify_presence ? (
            <sup className='text-gray'>
              {' '}
              <i className='mdi mdi-bell-off' />
            </sup>
          ) : null}
        </td>
        <td className='center-content'>
          <i
            className={`mdi mdi-${device.is_active ? 'check text-success' : 'alert text-danger'}`}
          />
        </td>
        <td>{device.ip}</td>
        <td
          className={
            devices
              .filter((d) => d.id !== device.id)
              .map((d) => d.mac.toLowerCase())
              .includes(device.mac.toLowerCase())
              ? 'text-danger'
              : 'text-primary'
          }
        >
          {device.mac}
        </td>
        <td>{new Date(device.last_seen).toLocaleString()}</td>
      </tr>
    ));
  }

  useEffect(() => {
    !devices && dispatch(api.getList());
  }, []);
  useEffect(() => {
    if (results) setDevices(results);
  }, [results]);

  useEffect(() => {
    if (!devices) return;
    if (!sorting?.length) {
      setDevices(results);
      return;
    }
    const devicesCopy = devices.slice();
    setDevices(
      devicesCopy.sort((a, b) => {
        for (let i = 0; i < sorting.length; i++) {
          const [key, order] = sorting[i].split('-');
          const direction = order === 'asc' ? 1 : -1;
          if (a[key] > b[key]) return direction;
          if (a[key] < b[key]) return -direction;
        }
        return 0;
      })
    );
  }, [sorting]);

  useEffect(() => {
    results && setDevices(search());
  }, [searchTerm]);

  return (
    <div>
      <div className='page-header'>
        <h3 className='page-title'>Network Devices</h3>
        <nav aria-label='breadcrumb'>
          <ol className='breadcrumb'>
            <li className='breadcrumb-item'>
              <a href='!#' onClick={(event) => event.preventDefault()}>
                Home
              </a>
            </li>
            <li className='breadcrumb-item active' aria-current='page'>
              Devices
            </li>
          </ol>
        </nav>
      </div>
      <div className='row'>
        <div className='col-md-12 offset-xl-1 col-xl-10 grid-margin stretch-card cent'>
          <div className='card'>
            <div className='card-body'>
              <h4 className='card-title'>
                Available devices{' '}
                <button
                  type='button'
                  className='btn btn-outline-success btn-sm border-0 bg-transparent'
                  onClick={() => dispatch(api.getList())}
                >
                  <i className='mdi mdi-refresh' />
                </button>
                <button
                  type='button'
                  className='btn btn-outline-primary btn-sm p-0 border-0 bg-transparent'
                  onClick={() => dispatch(DevicesApi.sync(token))}
                >
                  <i className='mdi mdi-sync-alert' />
                </button>
                <button
                  type='button'
                  className='btn btn-outline-primary btn-sm border-0 bg-transparent'
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <i className='mdi mdi-magnify' />
                </button>
                <button
                  type='button'
                  className='float-right btn btn-outline-primary btn-rounded btn-icon pl-1'
                  onClick={() => dispatch(setModalOpen(true))}
                >
                  <i className='mdi mdi-plus' />
                </button>
                <p className='text-small text-muted'>Total: {count}</p>
              </h4>
              {modalOpen ? null : <Errors errors={errors} />}
              <Collapse in={searchOpen}>
                <ul className='navbar-nav w-100 rounded'>
                  <li className='nav-item w-100'>
                    <form
                      className='nav-link mt-2 mt-md-0 d-lg-flex search'
                      onSubmit={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <input
                        value={searchTerm}
                        type='search'
                        className='form-control'
                        placeholder='Search devices'
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </form>
                  </li>
                </ul>
              </Collapse>
              <div className='table-responsive table-hover'>
                <table className='table'>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name {getSortingComponent('displayName', 'Name')}</th>
                      <th>
                        Is Active?{' '}
                        {getSortingComponent('is_active', 'Is Active')}
                      </th>
                      <th>IP {getSortingComponent('ip', 'IP')}</th>
                      <th>
                        Mac Address {getSortingComponent('mac', 'Mac Address')}
                      </th>
                      <th>
                        Last seen{' '}
                        {getSortingComponent('last_seen', 'Last seen')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>{getDeviceRows()}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EditModal />
    </div>
  );
};

export default Devices;
