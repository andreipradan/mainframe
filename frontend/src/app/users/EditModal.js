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
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import { setModalOpen, selectUser } from "../../redux/usersSlice";
import UsersApi from "../../api/users";

const EditModal = () => {
  const dispatch = useDispatch();
  const users = useSelector(state => state.users)
  const token = useSelector((state) => state.auth.token)

  const [alertOpen, setAlertOpen] = useState(false)
  useEffect(() => {setAlertOpen(!!users.errors)}, [users.errors])

  const [isActive, setIsActive] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (users.selectedUser) setIsActive(users.selectedUser.is_active || false)
  }, [users.selectedUser])

  const submitForm = event => {
    event.preventDefault()
    const data = {
      is_active: isActive,
      is_staff: isStaff,
    }
    dispatch(UsersApi.updateUser(token, users.selectedUser.id, data))
  }

  const clearModal = () => {
    setIsActive(false)
    setIsStaff(false)
  }

  const closeModal = () => {
    dispatch(selectUser())
    dispatch(setModalOpen(false))
    clearModal()
  }

  return <Modal centered show={!!users.selectedUser || users.modalOpen} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            Edit user {users.selectedUser?.email}?
            {
              users.selectedUser &&
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(UsersApi.getUser(token, users.selectedUser?.id))}>
                <i className="mdi mdi-refresh"></i>
              </button>
            }
          </div>
        </div>
        <p className="text-muted mb-0">Last login: {users.selectedUser?.last_login}</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {
        alertOpen && users.modalOpen && <div className="col-sm-12 grid-margin"><Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>
          {
            users.errors?.length || users.errors?.success === "False"
              ? users.errors?.msg
                ? <p className="text-danger">{users.errors.msg}</p>
                : users.errors?.length
                  ? <ul className="text-danger">{users.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
                  : null
              : "Sign in to continue."
          }
        </Alert></div>
      }
      {
        users.loadingUsers?.includes(users.selectedUser?.id)
        ? <ColorRing
            width = "100%"
            height = "50"
            wrapperStyle={{width: "100%"}}
          />
        : <Form onSubmit={submitForm}>
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
      }
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeModal}>Close</Button>
      <Button variant="primary" onClick={submitForm} >
        Update account
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;