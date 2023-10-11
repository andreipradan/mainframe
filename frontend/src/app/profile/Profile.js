import React, {useEffect, useState} from 'react';
import { Form } from 'react-bootstrap';
import {useDispatch, useSelector} from "react-redux";
import UsersApi from "../../api/users";
import {ColorRing} from "react-loader-spinner";
import Errors from "../shared/Errors";

const Profile = () => {
  const dispatch = useDispatch()
  const token = useSelector(state => state.auth.token)
  const user = useSelector(state => state.auth.user)
  const { errors, loadingUsers } = useSelector(state => state.users)

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [retypePassword, setRetypePassword] = useState("")

  const onFormSubmit = e => {
    e.preventDefault()
    dispatch(UsersApi.updateUser(token, user.id, {email, username}, true))
  }

  const onChangePasswordSubmit = e => {
    e.preventDefault()
    dispatch(UsersApi.changePassword(token, user.id, {old_password: currentPassword, password, password2: retypePassword}))
  }

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setUsername(user.username)
    }
  }, [user])

  return (
    <div>
      <Errors errors={errors}/>
      <div className="row">
        <div className="col-md-7 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                User Information
                {
                  loadingUsers?.includes(user?.id)
                    ? <ColorRing height={40} width={40}/>
                    : null
                }
              </h4>
              <p className="card-description"> Personal data </p>
              <form className="forms-sample" onSubmit={onFormSubmit}>
                <Form.Group>
                  <label htmlFor="exampleInputUsername1">Username</label>
                  <Form.Control
                    type="text"
                    id="exampleInputUsername1"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </Form.Group>
                <ul className="text-danger">{errors?.username?.map((err, i) => <li key={i}>{err}</li>)}</ul>
                <Form.Group>
                  <label htmlFor="exampleInputEmail1">Email address</label>
                  <Form.Control
                    type="email"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </Form.Group>
                <ul className="text-danger">{errors?.email?.map((err, i) => <li key={i}>{err}</li>)}</ul>
                <button type="submit" className="btn btn-primary mr-2">Submit</button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-md-5 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title text-danger">Danger Zone</h4>
              <p className="card-description text-warning"> Change Password</p>
              <form className="forms-sample" onSubmit={onChangePasswordSubmit}>
                <Form.Group>
                  <label htmlFor="currentPassword" className="col-form-label">
                    Current Password
                  </label>
                  <Form.Control
                    id="currentPassword"
                    isInvalid={errors?.password}
                    type="password"
                    className="form-control"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                </Form.Group>
                <Form.Group>
                  <label htmlFor="newPassword" className="col-form-label">
                    New Password
                  </label>
                  <Form.Control
                    id="newPassword"
                    isInvalid={errors?.password}
                    type="password"
                    className="form-control"
                    placeholder="New Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </Form.Group>
                <ul className="text-danger">{errors?.password?.map((err, i) => <li key={i}>{err}</li>)}</ul>
                <Form.Group>
                  <label htmlFor="retypePassword" className="col-form-label">
                    Retype New Password
                  </label>
                  <Form.Control
                    id="retypePassword"
                    isInvalid={password && retypePassword && password !== retypePassword}
                    type="password"
                    className="form-control"
                    placeholder="Retype New Password"
                    value={retypePassword}
                    onChange={e => setRetypePassword(e.target.value)}
                  />
                </Form.Group>
                <button
                  disabled={password && retypePassword && password !== retypePassword}
                  type="submit"
                  className="btn btn-primary mr-2"
                >
                  Change Password
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
