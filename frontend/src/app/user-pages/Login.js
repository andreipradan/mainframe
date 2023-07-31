import React, {useEffect, useState} from 'react';
import {Link, useHistory} from 'react-router-dom';
import {Button, Form} from 'react-bootstrap';
import AuthApi from "../../api/auth";
import { useDispatch, useSelector } from "react-redux";
import { Dna } from "react-loader-spinner";
import Alert from "react-bootstrap/Alert";
import logo from "../../assets/images/logo.svg"

const Login = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth)
  const history = useHistory();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messageOpen, setMessageOpen] = useState(false)

  const login = async (e) => {
    e.preventDefault()
    dispatch(AuthApi.Login({email, password}, history))
  }

  useEffect(() => {setMessageOpen(!!auth.message)}, [auth.message])

  return <div>
    <div className="d-flex align-items-center auth px-0">
      <div className="row w-100 mx-0">
        <div className="col-lg-6 mx-auto">
          <div className="card text-left py-5 px-4 px-sm-5">
            <div className="brand-logo">
              <img src={logo} alt="logo"/>
            </div>
            <h4>Hello! let's get started</h4>
            <h6 className="font-weight-light">
              {messageOpen && <Alert variant="success" dismissible onClose={() => setMessageOpen(false)}>{auth.message}</Alert>}

              {
                auth.errors?.length || auth.errors?.success === "False"
                  ? auth.errors?.msg
                    ? <p className="text-danger">{auth.errors.msg}</p>
                    : auth.errors?.length
                      ? <ul className="text-danger">{auth.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
                      : null
                  : "Sign in to continue."
              }
            </h6>
            <Form className="pt-3" onSubmit={login}>
              <Form.Group className="d-flex search-field">
                <Form.Control
                  required
                  type="email"
                  placeholder="Email"
                  size="lg"
                  className="h-auto"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  isInvalid={auth.errors?.email}
                />
              </Form.Group>
              <ul className="text-danger">
                {auth.errors?.email?.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              <Form.Group className="d-flex search-field">
                <Form.Control
                  className="h-auto"
                  isInvalid={auth.errors?.password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  required
                  size="lg"
                  type="password"
                  value={password}
                />
              </Form.Group>
              <ul className="text-danger">
                {auth.errors?.password?.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              <div className="mt-3">
                <Button
                  className="btn btn-block btn-primary btn-lg font-weight-medium auth-form-btn"
                  type="submit"
                >
                  {
                    auth.loading
                      ? <Dna
                        width = "100%"
                        height = "50"
                        wrapperStyle={{width: "100%"}}
                      />
                      : "Let's go " }
                </Button>
              </div>
              <div className="my-2 d-flex justify-content-between align-items-center">
                <a href="!#" onClick={event => {
                  event.preventDefault()
                  alert("Coming soon..")
                }} className="auth-link text-muted">Forgot
                  password?</a>
              </div>

              <div className="text-center mt-4 font-weight-light">
                Don't have an account? <Link to="/register" className="text-primary">Create</Link>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Login
