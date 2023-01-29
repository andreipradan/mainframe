import React, {useState} from 'react';
import {Link, useHistory} from 'react-router-dom';
import {Button, Form} from 'react-bootstrap';
import AuthApi from "../../api/auth";
import { useDispatch, useSelector } from "react-redux";

const Login = () => {
  const dispatch = useDispatch();
  const errors = useSelector((state) => state.auth.errors)
  const history = useHistory();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async (e) => {
    e.preventDefault()
    dispatch(AuthApi.Login({email, password}, history))
  }

  return <div>
    <div className="d-flex align-items-center auth px-0">
      <div className="row w-100 mx-0">
        <div className="col-lg-6 mx-auto">
          <div className="card text-left py-5 px-4 px-sm-5">
            <div className="brand-logo">
              <img src={require("../../assets/images/logo.svg")} alt="logo"/>
            </div>
            <h4>Hello! let's get started</h4>
            <h6 className="font-weight-light">{
              errors?.success === "False"
                ? <p className="text-danger">{errors?.msg}</p>
                : "Sign in to continue."
            }</h6>
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
                  isInvalid={errors?.email}
                />
              </Form.Group>
              <ul className="text-danger">
                {errors?.email?.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              <Form.Group className="d-flex search-field">
                <Form.Control
                  className="h-auto"
                  isInvalid={errors?.password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  required
                  size="lg"
                  type="password"
                  value={password}
                />
              </Form.Group>
              <ul className="text-danger">
                {errors?.password?.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              <div className="mt-3">
                <Button
                  className="btn btn-block btn-primary btn-lg font-weight-medium auth-form-btn"
                  type="submit"
                >
                  Let's go
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
