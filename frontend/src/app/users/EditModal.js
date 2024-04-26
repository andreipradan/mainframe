import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import { ColorRing } from "react-loader-spinner";
import Form from "react-bootstrap/Form";
import { selectUser } from "../../redux/usersSlice";
import { UsersApi } from "../../api/users";

const EditModal = () => {
  const dispatch = useDispatch();
  const {errors, loadingUsers, selectedUser} = useSelector(state => state.users)
  const {token, user} = useSelector((state) => state.auth)

  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (selectedUser) {
      setEmail(selectedUser.email || "")
      setIsActive(selectedUser.is_active || false)
      setIsStaff(selectedUser.is_staff || false)
      setUsername(selectedUser.username || "")
    }
  }, [selectedUser])

  const submitForm = event => {
    event.preventDefault()
    const data = {
      email,
      is_active: isActive,
      is_staff: isStaff,
      username: username,
    }
    dispatch(UsersApi.updateUser(token, selectedUser.id, data))
  }

  const clearModal = () => {
    setEmail("")
    setIsActive(false)
    setIsStaff(false)
    setUsername("")
  }
  const closeModal = () => {
    dispatch(selectUser())
    clearModal()
  }
  const deleteUser = () => {
    dispatch(UsersApi.deleteUser(token, selectedUser, user.id === selectedUser.id))
    closeModal()
  }

  return <Modal centered show={Boolean(selectedUser)} onHide={closeModal}>
    <Modal.Header closeButton>

      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            {selectedUser?.username}
            <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(UsersApi.getUser(token, selectedUser?.id))}>
              <i className="mdi mdi-refresh" />
            </button>
             {selectedUser?.id === user.id ? <span className="text-danger">&nbsp;<i className="mdi mdi-bell-alert-outline"/> This is you<i className="mdi mdi-bell-alert-outline"/> </span> : null}
          </div>
        </div>
        {
          selectedUser?.date
            ? <p className="text-muted mb-0">Joined: {new Date(selectedUser?.date).toLocaleDateString()}</p>
            : null
        }
        {
          selectedUser?.last_login
            ? <p className="text-muted mb-0">
                Last login: {new Date(selectedUser?.last_login).toLocaleDateString()}&nbsp;
                - {new Date(selectedUser?.last_login).toLocaleTimeString()}
              </p>
            : null
        }
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {
        loadingUsers?.includes(selectedUser?.id)
        ? <ColorRing
            width = "100%"
            height = "50"
            wrapperStyle={{width: "100%"}}
          />
        : <>
          {
            selectedUser?.groups?.length
              ? <p>
                  Groups:
                  <ul>{selectedUser?.groups.map((g, i) => <li key={i}>{g}</li> )}</ul>
                </p>
              : null
          }
          <Form onSubmit={submitForm}>
            <label htmlFor="email" className="col-form-label">Email</label>
            <Form.Group className="d-flex search-field">
              <Form.Control
                id={"email"}
                required
                type="email"
                placeholder="Email"
                size="lg"
                className="h-auto form-control rounded"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                isInvalid={errors?.email}
              />
            </Form.Group>
            <ul className="text-danger">{errors?.email?.map((err, i) => <li key={i}>{err}</li>)}</ul>
            <label htmlFor="username" className="col-form-label">Username</label>
            <Form.Group className="d-flex search-field">
              <Form.Control
                id={"username"}
                required
                type="username"
                placeholder="Username"
                size="lg"
                className="h-auto"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                isInvalid={errors?.username}
              />
            </Form.Group>
            <ul className="text-danger">{errors?.username?.map((err, i) => <li key={i}>{err}</li>)}</ul>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="custom-switch"
                label="Is Active"
                checked={isActive}
                onChange={() => {setIsActive(!isActive)}}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="custom-switch"
                label="Is Staff"
                checked={isStaff}
                onChange={() => {setIsStaff(!isStaff)}}
              />
            </Form.Group>
          </Form>
        </>
      }
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeModal}>Close</Button>
      <Button variant="danger" onClick={deleteUser}>Delete</Button>
      <Button type={"submit"} variant="primary" onClick={submitForm}>Update</Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;