import React, {useEffect, useState} from 'react';
import { Button, Form } from 'react-bootstrap';
import {Link, useHistory} from 'react-router-dom';
import Alert from "react-bootstrap/Alert";
import { useDispatch, useSelector } from "react-redux";
import AuthApi from "../../api/auth";
import {Dna} from "react-loader-spinner";

const Register = () => {
  const auth = useSelector((state) => state.auth)
  const dispatch = useDispatch();
  const history = useHistory();

  const [email, setEmail] = useState("");
  const [messageOpen, setMessageOpen] = useState(false)
  const [password, setPassword] = useState("")

  useEffect(() => setMessageOpen(!!auth.message), [auth.message])

  const register = e => {
    e.preventDefault()
    dispatch(AuthApi.Register({email, password}, history))
  }

  return (
    <div>
      <div className="d-flex align-items-center auth px-0 h-100">
        <div className="row w-100 mx-0">
          <div className="col-lg-4 mx-auto">
            <div className="card text-left py-5 px-4 px-sm-5">
              <h2 className="brand-logo">Register</h2>
              <h4>New here?</h4>
              <h6 className="font-weight-light">Signing up is easy. It only takes a few steps</h6>
              {messageOpen && <Alert variant="success" dismissible onClose={() => setMessageOpen(false)}>{auth.message}</Alert>}

              {
                auth.errors?.length || auth.errors?.success === "False"
                  ? auth.errors?.msg
                    ? <p className="text-danger">{auth.errors.msg}</p>
                    : auth.errors?.length
                      ? <ul className="text-danger">{auth.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
                      : null
                  : null
              }
              <Form className="pt-3" onSubmit={register}>
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
                  {
                    auth.errors?.email?.map((err, i) => <li key={i}>{err}</li>)}
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
                <div className="mb-4">
                  <div className="form-check">
                    <label className="form-check-label text-muted">
                      <input type="checkbox" className="form-check-input" required/>
                      <i className="input-helper"></i>
                      I agree to all the <Link to="/documentation/terms-and-conditions">Terms & Conditions</Link>
                    </label>
                  </div>
                </div>
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
                        : "Register " }
                  </Button>
                </div>
                <div className="text-center mt-4 font-weight-light">
                  Already have an account? <Link to="/login" className="text-primary">Login</Link>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
