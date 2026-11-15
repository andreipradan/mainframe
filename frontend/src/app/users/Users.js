import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';

import { Tooltip } from 'react-tooltip';

import { selectUser } from '../../redux/usersSlice';
import { UsersApi } from '../../api/users';
import EditModal from './EditModal';
import Errors from '../shared/Errors';

function UserRows({ onSelectUser, users }) {
  return (
    <>
      {users.loading && (
        <Circles
          visible
          width='100%'
          ariaLabel='ball-triangle-loading'
          wrapperStyle={{ float: 'right' }}
          color='orange'
        />
      )}
      {!users.loading &&
        users.results?.length > 0 &&
        users.results.map((user, index) => (
          <tr
            key={user.id}
            className='cursor-pointer'
            onClick={() => onSelectUser(user.id)}
          >
            <td>{index + 1}</td>
            <td>
              {user.email}
              <br />
              <sub>
                Joined:{' '}
                {user.date ? new Date(user.date).toLocaleDateString() : null}
              </sub>
            </td>
            <td>
              <i
                className={`mdi mdi-${user.is_active ? 'check text-success' : 'alert text-danger'}`}
              />
            </td>
            <td>
              <i
                className={`mdi mdi-${user.is_staff ? 'check text-success' : 'alert text-danger'}`}
              />
            </td>
            <td>
              {user.last_login
                ? new Date(user.last_login).toLocaleDateString()
                : '-'}
              <br />
              <sub>
                {user.last_login
                  ? new Date(user.last_login).toLocaleTimeString()
                  : null}
              </sub>
            </td>
          </tr>
        ))}
      {!users.loading && !users.results?.length && (
        <tr>
          <td colSpan={6}>
            <span>No accounts found</span>
          </td>
        </tr>
      )}
    </>
  );
}

function UsersTableHeader() {
  return (
    <thead>
      <tr>
        <th> # </th>
        <th> Email </th>
        {/*<th> Groups </th>*/}
        <th> Active </th>
        <th> Staff </th>
        <th> Last login </th>
      </tr>
    </thead>
  );
}

function UsersTable({ onSelectUser, users }) {
  return (
    <div className='table-responsive'>
      <table className='table table-hover'>
        <UsersTableHeader />
        <tbody>
          <UserRows onSelectUser={onSelectUser} users={users} />
        </tbody>
      </table>
    </div>
  );
}

function UsersCard({ onSelectUser, users }) {
  return (
    <div className='card grid-margin'>
      <div className='card-body'>
        <UsersTable onSelectUser={onSelectUser} users={users} />
      </div>
    </div>
  );
}

function UsersBreadcrumb({ onNavigate }) {
  return (
    <nav aria-label='breadcrumb'>
      <ol className='breadcrumb'>
        <li className='breadcrumb-item'>
          <a href='!#' onClick={onNavigate}>
            Home
          </a>
        </li>
        <li className='breadcrumb-item active' aria-current='page'>
          Users
        </li>
      </ol>
    </nav>
  );
}

function UsersRefreshButton({ onClick }) {
  return (
    <button
      type='button'
      className='btn btn-outline-success btn-sm border-0 bg-transparent'
      onClick={onClick}
    >
      <i className='mdi mdi-refresh' />
    </button>
  );
}

const Users = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const token = useSelector((state) => state.auth.token);

  const users = useSelector((state) => state.users);

  useEffect(() => {
    users.selectedUser && dispatch(selectUser());
    !users.results?.length && dispatch(UsersApi.getList(token));
    return () => dispatch(selectUser());
  }, []);

  const onUsersRefresh = useCallback(
    () => dispatch(UsersApi.getList(token)),
    []
  );

  return (
    <div>
      <div className='page-header'>
        <h3 className='page-title'>
          Users <UsersRefreshButton onClick={onUsersRefresh} />
        </h3>
        <UsersBreadcrumb
          onNavigate={(event) => {
            event.preventDefault();
            history.push('/');
          }}
        />
      </div>
      {!users.selectedUser ? <Errors errors={users.errors} /> : null}
      <UsersCard
        onSelectUser={(id) => dispatch(selectUser(id))}
        users={users}
      />
      <EditModal />
      <Tooltip anchorSelect='#paid-percentage' place='bottom-start'>
        Percentage of the remaining principal
        <br />
      </Tooltip>
      <Tooltip anchorSelect='#prepaid-percentage' place='bottom-start'>
        Percentage of the paid amount
      </Tooltip>
      <Tooltip anchorSelect='#principal-percentage' place='bottom-start'>
        Percentage of the total loan
      </Tooltip>
      <Tooltip anchorSelect='#interest-percentage' place='bottom-start'>
        Percentage of the remaining interest
      </Tooltip>
    </div>
  );
};

export default Users;
