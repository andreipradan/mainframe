import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import {Link, useHistory} from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import AuthApi from "../../api/auth";
import {Dna} from "react-loader-spinner";
import Errors from "../shared/Errors";

const Register = () => {
  const {errors, loading} = useSelector((state) => state.auth)
  const dispatch = useDispatch();
  const history = useHistory();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("")
  const [retypePassword, setRetypePassword] = useState("")

  const register = e => {
    e.preventDefault()
    dispatch(AuthApi.Register({email, password}, history))
  }

  return (
    <div>
      <div className="d-flex align-items-center auth px-0 h-100">
        <div className="row w-100 mx-0">
          <div className="col-lg-6 mx-auto">
            <div className="card text-left py-5 px-4 px-sm-5">
              <h2 className="brand-logo">Register</h2>
              <h4>New here?</h4>
              <h6 className="font-weight-light">Signing up is easy. It only takes a few steps</h6>
              {
                errors?.non_field_errors
                  ? <Errors errors={errors.non_field_errors}/>
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
                    isInvalid={errors?.email}
                  />
                </Form.Group>
                <ul className="text-danger">{errors?.email?.map((err, i) => <li key={i}>{err}</li>)}</ul>

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
                <ul className="text-danger">{errors?.password?.map((err, i) => <li key={i}>{err}</li>)}</ul>

                <Form.Group className="d-flex search-field">
                  <Form.Control
                    className="h-auto"
                    isInvalid={password && retypePassword && password !== retypePassword}
                    onChange={(event) => setRetypePassword(event.target.value)}
                    placeholder="Retype Password"
                    required
                    size="lg"
                    type="password"
                    value={retypePassword}
                  />
                </Form.Group>
                <ul className={`text-${password && retypePassword && password !== retypePassword ? "danger" : "success" }`}>{
                  password && retypePassword
                    ? password !== retypePassword
                      ? "Both passwords must be the same"
                      : "Awesome"
                    : null
                }</ul>

                <div className="mb-4">
                  <div className="form-check">
                    <label className="form-check-label text-muted">
                      <input type="checkbox" className="form-check-input" required/>
                      <i className="input-helper" />
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
                      loading
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
