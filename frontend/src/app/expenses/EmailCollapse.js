import { Collapse, Form } from 'react-bootstrap';
import { GroupsApi } from '../../api/expenses';
import { Circles } from 'react-loader-spinner';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const EmailCollapse = (props) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const { token } = useSelector((state) => state.auth);
  const groups = useSelector((state) => state.groups);

  const [email, setEmail] = useState('');

  useEffect(() => {
    !props.emailOpen && setEmail('');
  }, [props.emailOpen]);

  useEffect(() => {
    if (props.emailOpen === props.groupId) {
      inputRef.current?.focus();
    }
  }, [props.emailOpen, props.groupId]);

  return (
    <Collapse in={props.emailOpen === props.groupId} style={{ width: '100%' }}>
      <form
        id={`group-${props.groupId}-email-form`}
        className='nav-link mt-2'
        onSubmit={(e) => {
          e.preventDefault();
          dispatch(GroupsApi.inviteUser(token, props.groupId, email));
          setEmail('');
        }}
      >
        {groups.errors?.[props.groupId] ? (
          <span className='nav-link mb-0 text-danger'>
            {groups.errors?.[props.groupId]}
          </span>
        ) : null}
        <Form.Group>
          {groups.loading ? (
            <Circles width={20} height={20} />
          ) : (
            <Form.Control
              ref={inputRef}
              type='email'
              className='form-control rounded'
              placeholder={'Email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Form.Group>
      </form>
    </Collapse>
  );
};
export default EmailCollapse;
