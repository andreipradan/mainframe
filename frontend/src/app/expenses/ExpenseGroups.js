import React, {useEffect, useRef, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";

import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";
import "react-datepicker/dist/react-datepicker.css";

import { GroupsApi } from "../../api/expenses";
import { useHistory } from "react-router-dom";
import { selectItem, setKwargs } from "../../redux/groupsSlice";
import BottomPagination from "../shared/BottomPagination";
import Errors from "../shared/Errors";
import { Form } from "react-bootstrap";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import EmailCollapse from "./EmailCollapse";

const ExpenseGroups = () => {
  const dispatch = useDispatch();
  const history = useHistory()
  const groupNameRef = useRef()

  const {token, user: currentUser} = useSelector((state) => state.auth)
  const groups = useSelector(state => state.groups)

  const api = new GroupsApi(token)

  const [emailOpen, setEmailOpen] = useState(null)

  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState("")

  const [groupToRemove, setGroupToRemove] = useState(null)
  const [userToRemove, setUserToRemove] = useState(null)

  const toggleEmailOpen = groupId => {
    emailOpen === groupId
      ? setEmailOpen(null)
      : setEmailOpen(groupId)
  }

  useEffect(() => {
    addGroupOpen && groupNameRef.current && groupNameRef.current.focus()
  }, [addGroupOpen]);

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Expense groups
        {
          groups.loading
            ? <Circles
              visible
              height={20}
              width={20}
              wrapperClass="btn"
              wrapperStyle={{display: "default"}}
              ariaLabel="ball-triangle-loading"
              color='green'
            />
            : <button
              type="button"
              className="btn btn-outline-success btn-sm border-0 bg-transparent"
              onClick={() => {
                dispatch(api.getList())
              }}
            >
              <i className="mdi mdi-refresh" />
          </button>
        }
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/expenses/my" onClick={event => {
            event.preventDefault()
            history.push("/expenses/my")
          }}>Expenses</a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">Groups</li>
        </ol>
      </nav>
    </div>
    {
      (groups.errors?.detail || groups.errors?.length || groups.errors?.name) && (!groupToRemove || !userToRemove || !addGroupOpen)
        ? <Errors errors={groups.errors}/>
        : null
    }


    <div className="row">
      <div className="col-md-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <div className="card-title">
              <button
                type="button"
                className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                onClick={() => setAddGroupOpen(true)}
              >
                <i className="mdi mdi-plus" />
              </button>
            </div>
            <div className="mb-0 text-muted">Total: {groups.count}</div>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Name </th>
                    <th> Members </th>
                    <th className="text-center"> Actions </th>
                  </tr>
                </thead>
                <tbody>
                {
                  groups.results?.length
                    ? groups.results.map(t =>
                      <tr key={t.id}>
                        <td className="cursor-pointer text-primary"> {t.name} </td>
                        {
                          t.users.length
                            ? <td>
                              <ul className="list-arrow">
                                {t.users.map(user =>
                                  <li key={user.id}>
                                    {user.username} / {user.email}{!user.is_active ? <small className="text-warning"> (Inactive)</small> : null}
                                    <i
                                      className="pl-1 mdi mdi-window-close text-danger"
                                      onClick={() => {
                                        dispatch(selectItem(t.id))
                                        setUserToRemove(user)
                                      }}
                                      style={{cursor: "pointer"}}
                                    />
                                  </li>
                                )}
                              </ul>
                              <EmailCollapse emailOpen={emailOpen} groupId={t.id}/>
                              </td>
                            : <td>
                              No users in this group
                              <EmailCollapse emailOpen={emailOpen} groupId={t.id}/>
                            </td>
                        }
                        <td className="text-center">
                          <i
                            className="text-primary mdi mdi-account-plus pr-1"
                            onClick={() => toggleEmailOpen(t.id)}
                            style={{cursor: "pointer"}}
                          />
                          {
                            t.created_by === currentUser?.id || currentUser?.is_staff
                              ? <i
                                  style={{cursor: "pointer"}}
                                  className="mdi mdi-trash-can-outline text-danger"
                                  onClick={() => setGroupToRemove(t)}
                                />
                              : null
                          }
                        </td>

                      </tr>)
                    : <tr><td colSpan={6}><span>No groups found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={groups} fetchMethod={api.getList} newApi={true} setKwargs={setKwargs} />

          </div>
        </div>
      </div>
    </div>
    <Modal centered show={addGroupOpen} onHide={() => setAddGroupOpen(false)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Add new group
            </div>
          </div>
          <p className="text-muted mb-0">Type in the name of your new group</p>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form
          className="nav-link mt-2"
          onSubmit={e => {
            e.preventDefault()
            dispatch(api.create({ name: groupName }))
            setGroupName("")
            setAddGroupOpen(false)
          }}
        >
          {
            (groups.errors?.detail || groups.errors?.length) && addGroupOpen
              ? <Errors errors={groups.errors} />
              : null
          }
          <Form.Group>
            <Form.Control
              ref={groupNameRef}
              type="text"
              className="form-control rounded"
              placeholder="Name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <ul className="text-danger">{groups.errors?.name?.map(err => <li key={err}>{err}</li>)}</ul>
          </Form.Group>
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => {
          setAddGroupOpen(false)
          setGroupName("")
        }}>No, go back</Button>
        <Button
          variant="primary"
          onClick={e => {
            e.preventDefault()
            dispatch(api.create({ name: groupName }))
            setGroupName("")
            setAddGroupOpen(false)
          }}
        >
          Yes, create!
        </Button>
      </Modal.Footer>
    </Modal>
    <Modal centered show={Boolean(groupToRemove)} onHide={() => setGroupToRemove(null)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Are you sure?
            </div>
          </div>
          <p className="text-muted mb-0">
            <ul>
              <li>Group: <span className="text-danger">{groupToRemove?.name}</span></li>
              <li>
                Users:
                <ul>
                  {
                    groupToRemove?.users?.length
                      ? groupToRemove?.users?.map(u => <li key={u.id}>{u.username} ({u.email})</li>)
                      : "No users in this group"
                  }
                </ul>
              </li>
            </ul>
          </p>
        </Modal.Title>
      </Modal.Header>
      {
        (groups.errors?.detail || groups.errors?.length) && groupToRemove
          ? <Errors errors={groups.errors} />
          : null
      }
      <Modal.Body>
        Delete group <b>{groupToRemove?.name}</b>?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setGroupToRemove(null)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(api.delete(groupToRemove?.id, groupToRemove?.name))
            setGroupToRemove(null)
          }}
        >
          Yes, delete!
        </Button>
      </Modal.Footer>
    </Modal>
    <Modal centered show={userToRemove} onHide={() => setUserToRemove(null)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Are you sure?
            </div>
          </div>
          <p className="text-muted mb-0">
            <ul>
              <li>Group: {groups.selectedItem?.name}</li>
              <li>User: {userToRemove?.username} ({userToRemove?.email})</li>
            </ul>
          </p>
        </Modal.Title>
      </Modal.Header>
      {
        (groups.errors?.detail || groups.errors?.length) && userToRemove
          ? <Errors errors={groups.errors} />
          : null
      }
      <Modal.Body>
        Remove user <b>{userToRemove?.username}</b> from group <b>{groups.selectedItem?.name}</b>?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setUserToRemove(null)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(GroupsApi.removeUserFromGroup(token, groups.selectedItem?.id, userToRemove?.id))
            setUserToRemove(null)
          }}
        >
          Yes, remove!
        </Button>
      </Modal.Footer>
    </Modal>
  </div>
}

export default ExpenseGroups;