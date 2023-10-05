import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";

import Alert from "react-bootstrap/Alert";
import { Tooltip } from "react-tooltip";
import { useHistory } from "react-router-dom";

import EditModal from "./EditModal";
import UsersApi from "../../api/users";
import {
  setModalOpen,
  selectUser,
  setSelectedUser
} from "../../redux/usersSlice";


const Users = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)

  const users = useSelector(state => state.users)

  const [alertOpen, setAlertOpen] = useState(false)

  useEffect(() => {setAlertOpen(!!users.errors)}, [users.errors])

  useEffect(() => {
    users.selectedUser && dispatch(setSelectedUser())
    !users.results?.length && dispatch(UsersApi.getList(token))
    return () => dispatch(setSelectedUser())
  }, []);

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Users
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(UsersApi.getList(token))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item active" aria-current="page">Users</li>
        </ol>
      </nav>
    </div>
    {alertOpen && !users.modalOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>
      {users.errors}
    </Alert>}
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Users
              <button
                  type="button"
                  className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                  onClick={() => dispatch(setModalOpen(true))}
              >
                <i className="mdi mdi-plus"></i>
              </button>
            </h4>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> # </th>
                    <th> Email </th>
                    <th> Groups </th>
                    <th> Active </th>
                    <th> Staff </th>
                    <th> Date joined </th>
                    <th> Last login </th>
                    <th> Edit </th>
                  </tr>
                </thead>
                <tbody>
                {
                  users.loading
                    ? <Circles
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                    : users.results?.length
                        ? users.results.map((p, i) =>
                        <tr key={i}>
                          <td>{p.id}</td>
                          <td>{p.email}</td>
                          <td><ul>{p.groups.map(g => <li key={i}>{g}</li>)}</ul></td>
                          <td><i className={`mdi mdi-${p.is_active ? "check text-success" : "alert text-danger"}`} /></td>
                          <td><i className={`mdi mdi-${p.is_staff ? "check text-success" : "alert text-danger"}`} /></td>
                          <td>
                            {`${new Date(p.last_login).toLocaleDateString()}`}<br/>
                            <sub>{new Date(p.last_login).toLocaleTimeString()}</sub>
                          </td>
                          <td>
                            {`${new Date(p.date).toLocaleDateString()}`}<br/>
                            <sub>{new Date(p.date).toLocaleTimeString()}</sub>
                          </td>
                          <td>
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-pencil text-secondary"
                              onClick={() => dispatch(selectUser(p.id))}
                            />
                          </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No accounts found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <EditModal />
    <Tooltip anchorSelect="#paid-percentage" place="bottom-start">
      Percentage of the remaining principal<br/>
    </Tooltip>
    <Tooltip anchorSelect="#prepaid-percentage" place="bottom-start">
      Percentage of the paid amount
    </Tooltip>
    <Tooltip anchorSelect="#principal-percentage" place="bottom-start">
      Percentage of the total loan
    </Tooltip>
    <Tooltip anchorSelect="#interest-percentage" place="bottom-start">
      Percentage of the remaining interest
    </Tooltip>
  </div>
}

export default Users;