import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import AuthApi from '../../api/auth';
import { useDispatch, useSelector } from 'react-redux';
import { Dna } from 'react-loader-spinner';
import Alert from 'react-bootstrap/Alert';

function LoginFeedback({ auth, forgotPasswordOpen, messageOpen, onClose }) {
  return (
    <>
      {messageOpen && (
        <Alert variant='success' dismissible onClose={onClose}>
          {auth.message}
        </Alert>
      )}
      {forgotPasswordOpen && (
        <Alert variant='info'>Password recovery is coming soon.</Alert>
      )}
      {auth.errors?.detail && (
        <p className='text-danger'>{auth.errors.detail}</p>
      )}
      {!auth.errors?.detail && auth.errors?.length && (
        <ul className='text-danger'>
          {auth.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {!auth.errors?.detail && !auth.errors?.length && 'Sign in to continue.'}
    </>
  );
}

function LoginForm({
  auth,
  email,
  onEmailChange,
  onForgotPassword,
  onPasswordChange,
  onSubmit,
  password,
}) {
  return (
    <Form className='pt-3' onSubmit={onSubmit}>
      <Form.Group className='d-flex search-field'>
        <Form.Control
          required
          type='email'
          placeholder='Email'
          size='lg'
          className='h-auto'
          value={email}
          onChange={onEmailChange}
          isInvalid={auth.errors?.email}
        />
      </Form.Group>
      <ul className='text-danger'>
        {auth.errors?.email?.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      <Form.Group className='d-flex search-field'>
        <Form.Control
          className='h-auto'
          isInvalid={auth.errors?.password}
          onChange={onPasswordChange}
          placeholder='Password'
          required
          size='lg'
          type='password'
          value={password}
        />
      </Form.Group>
      <ul className='text-danger'>
        {auth.errors?.password?.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      <div className='mt-3'>
        <Button
          className='btn btn-block btn-primary btn-lg font-weight-medium auth-form-btn'
          type='submit'
        >
          {auth.loading ? (
            <Dna width='100%' height='50' wrapperStyle={{ width: '100%' }} />
          ) : (
            "Let's go "
          )}
        </Button>
      </div>
      <div className='my-2 d-flex justify-content-between align-items-center'>
        <a
          href='!#'
          onClick={onForgotPassword}
          className='auth-link text-muted'
        >
          Forgot password?
        </a>
      </div>
      <div className='text-center mt-4 font-weight-light'>
        Don&apos;t have an account?{' '}
        <Link to='/register' className='text-primary'>
          Create
        </Link>
      </div>
    </Form>
  );
}

function LoginCard({
  auth,
  email,
  forgotPasswordOpen,
  messageOpen,
  onEmailChange,
  onForgotPassword,
  onMessageClose,
  onPasswordChange,
  onSubmit,
  password,
}) {
  return (
    <div className='col-lg-6 mx-auto'>
      <div className='card text-left py-5 px-4 px-sm-5'>
        <h2 className='brand-logo'>Sign in</h2>
        <h4>Hello! let&apos;s get started</h4>
        <h6 className='font-weight-light'>
          <LoginFeedback
            auth={auth}
            forgotPasswordOpen={forgotPasswordOpen}
            messageOpen={messageOpen}
            onClose={onMessageClose}
          />
        </h6>
        <LoginForm
          auth={auth}
          email={email}
          onEmailChange={onEmailChange}
          onForgotPassword={onForgotPassword}
          onPasswordChange={onPasswordChange}
          onSubmit={onSubmit}
          password={password}
        />
      </div>
    </div>
  );
}

const Login = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    dispatch(AuthApi.Login({ email, password }, history, auth.redirectUrl));
  };

  useEffect(() => setMessageOpen(Boolean(auth.message)), [auth.message]);

  return (
    <div>
      <div className='d-flex align-items-center auth px-0'>
        <LoginCard
          auth={auth}
          email={email}
          forgotPasswordOpen={forgotPasswordOpen}
          messageOpen={messageOpen}
          onEmailChange={(event) => setEmail(event.target.value)}
          onForgotPassword={(event) => {
            event.preventDefault();
            setForgotPasswordOpen(true);
          }}
          onMessageClose={() => setMessageOpen(false)}
          onPasswordChange={(event) => setPassword(event.target.value)}
          onSubmit={login}
          password={password}
        />
      </div>
    </div>
  );
};

export default Login;
