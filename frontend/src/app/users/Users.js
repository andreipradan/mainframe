import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { Circles } from "react-loader-spinner";

import { Tooltip } from "react-tooltip";

import { selectUser } from "../../redux/usersSlice";
import { UsersApi } from "../../api/users";
import EditModal from "./EditModal";
import Errors from "../shared/Errors";

const Users = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const token = useSelector((state) => state.auth.token)

  const users = useSelector(state => state.users)

  useEffect(() => {
    users.selectedUser && dispatch(selectUser())
    !users.results?.length && dispatch(UsersApi.getList(token))
    return () => dispatch(selectUser())
  }, []);

  const onUsersRefresh = useCallback(() => dispatch(UsersApi.getList(token)), [])

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Users
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={onUsersRefresh}
        >
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <a href="!#" onClick={event => {
              event.preventDefault()
              history.push("/")
            }}>Home</a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">Users</li>
        </ol>
      </nav>
    </div>
    {!users.selectedUser ? <Errors errors={users.errors}/> : null}
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
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
                <tbody>
                {
                  users.loading
                    ? <Circles
                      visible
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                    : users.results?.length
                        ? users.results.map((p, i) =>
                        <tr key={p.id} className={"cursor-pointer"} onClick={() => dispatch(selectUser(p.id))} >
                          <td>{i + 1}</td>
                          <td>
                            {p.email}<br/>
                            <sub>
                              Joined: {p.date ? new Date(p.date).toLocaleDateString(): null}
                            </sub>
                          </td>
                          {/*<td><ul>{p.groups.map(g => <li key={i}>{g}</li>)}</ul></td>*/}
                          <td><i className={`mdi mdi-${p.is_active ? "check text-success" : "alert text-danger"}`} /></td>
                          <td><i className={`mdi mdi-${p.is_staff ? "check text-success" : "alert text-danger"}`} /></td>
                          <td>
                            {p.last_login ? `${new Date(p.last_login).toLocaleDateString()}`: "-"}<br/>
                            <sub>{p.last_login ? new Date(p.last_login).toLocaleTimeString(): null}</sub>
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