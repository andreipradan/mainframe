import React, { useState } from 'react';
import { useDispatch, useSelector } from "react-redux";

import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";
import "react-datepicker/dist/react-datepicker.css";

import { GroupsApi } from "../../api/expenses";
import { useHistory } from "react-router-dom";
import {selectItem, setKwargs} from "../../redux/groupsSlice";
import BottomPagination from "../shared/BottomPagination";
import Errors from "../shared/Errors";
import {Collapse, Form} from "react-bootstrap";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";


const Groups = () => {
  const dispatch = useDispatch();
  const history = useHistory()

  const token = useSelector((state) => state.auth.token)
  const groups = useSelector(state => state.groups)

  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState("")

  const [email, setEmail] = useState("")
  const [emailOpen, setEmailOpen] = useState(null)

  const [groupToRemove, setGroupToRemove] = useState(null)
  const [userToRemove, setUserToRemove] = useState(null)

  const toggleEmailOpen = groupId => {
    setEmail("")
    emailOpen === groupId
      ? setEmailOpen(null)
      : setEmailOpen(groupId)
  }

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Groups
        {
          groups.loading
            ? <Circles
              visible={true}
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
                dispatch(GroupsApi.getList(token))
              }}
            >
              <i className="mdi mdi-refresh"></i>
          </button>
        }
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/expenses" onClick={event => {
            event.preventDefault()
            history.push("/expenses")
          }}>Expenses</a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">Groups</li>
        </ol>
      </nav>
    </div>
    {
      (groups.errors?.detail || groups.errors?.length) && (!groupToRemove || userToRemove)
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
                onClick={() => dispatch(setAddGroupOpen(true))}
              >
                <i className="mdi mdi-plus"></i>
              </button>
            </div>
            <div className="table-responsive">
              <div className="mb-0 text-muted">Total: {groups.count}</div>
              <table className="table">
                <thead>
                  <tr>
                    <th> Name </th>
                    <th style={{textAlign: "center"}}> Members </th>
                    <th style={{textAlign: "center"}}> Delete? </th>
                  </tr>
                </thead>
                <tbody>
                {
                  groups.results?.length
                    ? groups.results.map((t, i) =>
                      <tr key={i}>
                        <td> {t.name} </td>
                          {
                            t.users.length
                              ? <td>
                                  <table className="table table-condensed">
                                  <thead>
                                  <tr>
                                    <th>User</th>
                                    <th>Active?</th>
                                  </tr>
                                  </thead>
                                  <tbody>
                                  {
                                    t.users.map((user, i) =>
                                      <tr key={i}>
                                        <td>
                                          {user.username} ({user.email})
                                          <i
                                            className="pl-1 mdi mdi-window-close text-danger"
                                            onClick={() => {
                                              dispatch(selectItem(t.id))
                                              setUserToRemove(user)
                                            }}
                                            style={{cursor: "pointer"}}
                                          />
                                        </td>
                                        <td>
                                          <i className={`mdi mdi-${user.is_active ? "check-outline text-success" : "close-circle text-danger"}`} />
                                        </td>
                                      </tr>)
                                  }
                                  <tr>
                                    <td colSpan={4} style={{textAlign: "center"}}>
                                      <Collapse in={ emailOpen === t.id } style={{width: "100%"}}>
                                        <form
                                          className="nav-link mt-2"
                                          onSubmit={e => {
                                            e.preventDefault()
                                            dispatch(GroupsApi.inviteUser(token, t.id, email))
                                          }}
                                        >
                                          {
                                            groups.errors?.[t.id]
                                              ? <span className="nav-link mt-2 mb-0 text-danger">{groups.errors?.[t.id]}</span>
                                              : null
                                          }
                                          <Form.Group>
                                            <Form.Control
                                              type="email"
                                              className="form-control rounded"
                                              placeholder="Email"
                                              value={email}
                                              onChange={e => setEmail(e.target.value)}
                                            />
                                          </Form.Group>
                                        </form>
                                      </Collapse>
                                    </td>
                                  </tr>
                                  </tbody>
                                  </table></td>
                              : <td style={{textAlign: "center"}}>
                                No users in this group
                                <div className="pt-2">
                                  <br/>
                                  <Collapse in={ emailOpen === t.id } style={{width: "100%"}}>
                                    <form
                                      className="nav-link mt-2"
                                      onSubmit={e => {
                                        e.preventDefault()
                                        dispatch(GroupsApi.inviteUser(token, t.id, email))
                                      }}
                                    >
                                      {
                                        groups.errors?.[t.id]
                                          ? <span className="nav-link mt-2 mb-0 text-danger">{groups.errors?.[t.id]}</span>
                                          : null
                                      }
                                      <Form.Group>
                                        <Form.Control
                                          type="email"
                                          className="form-control rounded"
                                          placeholder="Email"
                                          value={email}
                                          onChange={e => setEmail(e.target.value)}
                                        />
                                      </Form.Group>
                                    </form>
                                  </Collapse>
                                </div>
                              </td>
                          }
                        <td style={{textAlign: "center"}}>
                          <i
                            className="text-primary mdi mdi-account-plus pr-1"
                            onClick={() => toggleEmailOpen(t.id)}
                            style={{cursor: "pointer"}}
                          />
                          <i
                            style={{cursor: "pointer"}}
                            className="mdi mdi-trash-can-outline text-danger"
                            onClick={() => setGroupToRemove(t)}
                          />
                        </td>

                      </tr>)
                    : <tr><td colSpan={6}><span>No groups found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={groups} fetchMethod={GroupsApi.getList} setKwargs={setKwargs} />

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
            dispatch(GroupsApi.create(token, groupName))
          }}
        >
          {
            (groups.errors?.detail || groups.errors?.length) && addGroupOpen
              ? <Errors errors={groups.errors} />
              : null
          }
          <Form.Group>
            <Form.Control
              type="text"
              className="form-control rounded"
              placeholder="Name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
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
          onClick={() => {
            dispatch(GroupsApi.create(token, groupName))
            setGroupName("null")
          }}
        >
          Yes, create!
        </Button>
      </Modal.Footer>
    </Modal>
    <Modal centered show={groupToRemove} onHide={() => setGroupToRemove(null)}>
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
                      ? groupToRemove?.users?.map((u, i) => <li key={i}>{u.username} ({u.email})</li>)
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
            dispatch(GroupsApi.deleteGroup(token, groupToRemove?.id))
            setUserToRemove(null)
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

export default Groups;