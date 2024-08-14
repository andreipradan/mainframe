import React from 'react'
import { useDispatch, useSelector } from "react-redux";
import { Audio, ColorRing } from "react-loader-spinner";
import Form from "react-bootstrap/Form";

import { selectItem, setKwargs } from "../../redux/messagesSlice";
import { selectStyles } from "../finances/Accounts/Categorize/EditModal";
import BottomPagination from "../shared/BottomPagination";
import EditModal from "./components/EditModal";
import Errors from "../shared/Errors";
import MessagesApi from "../../api/messages";
import Select from "react-select";


const Messages = () =>  {
  const dispatch = useDispatch();
  const messages = useSelector(state => state.messages)
  const token = useSelector(state => state.auth.token)

  const onAuthorChange = newValue => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({author: newTypes, page: 1}))
  }

  const onChatIdChange = newValue => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({chat_id: newTypes, page: 1}))
  }

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Messages</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Messages</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <Errors errors={messages.errors}/>
              <div className="table-responsive">
                <div className="mb-0 text-muted">
                  <div className="row">
                    <div className="col-sm-6">
                      <h4 className="text-secondary">
                        Saved messages
                        <button
                            type="button"
                            className="btn btn-outline-success btn-sm border-0 bg-transparent"
                            onClick={() => dispatch(MessagesApi.getList(token, messages.kwargs))}
                        >
                          <i className="mdi mdi-refresh" />
                        </button>
                        <p className="text-small text-muted">Total: {messages.count}</p>
                      </h4>
                    </div>
                    <div className="col-sm-6">
                      <Form
                        className="row"
                        onSubmit={e => {e.preventDefault(); dispatch(MessagesApi.getList(token, messages.kwargs))}}
                      >
                        <Form.Group className="col-md-6">
                          <Form.Label>Author</Form.Label>&nbsp;
                          <Select
                            closeMenuOnSelect={false}
                            isDisabled={messages.loading}
                            isLoading={messages.loading}
                            isMulti
                            onChange={onAuthorChange}
                            options={messages.authors?.map(t => ({label: t, value: t}))}
                            styles={selectStyles}
                            value={messages.kwargs.author?.map(t => ({label: t, value: t}))}
                          />
                        </Form.Group>
                        <Form.Group className="col-md-6">
                          <Form.Label>Chat ID</Form.Label>&nbsp;
                          <Select
                            closeMenuOnSelect={false}
                            isDisabled={messages.loading}
                            isLoading={messages.loading}
                            isMulti
                            onChange={onChatIdChange}
                            options={messages.chat_ids?.map(t => ({label: t, value: t}))}
                            styles={selectStyles}
                            value={messages.kwargs.chat_id?.map(t => ({label: t, value: t}))}
                          />
                        </Form.Group>
                      </Form>
                    </div>
                  </div>
                </div>
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Date </th>
                      <th> Title </th>
                      <th> Author </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !messages.loading
                        ? messages.results?.length
                          ? messages.results.map(
                            (msg, i) => !messages.loadingItems?.includes(msg.id)
                              ? <tr key={i}>
                                <td onClick={() => dispatch(selectItem(msg.id))} className="cursor-pointer">{i + 1}</td>
                                <td onClick={() => dispatch(selectItem(msg.id))} className="cursor-pointer">{new Date(msg.date).toLocaleString()}</td>
                                <td onClick={() => dispatch(selectItem(msg.id))} className="cursor-pointer">{msg.chat_title}</td>
                                <td onClick={() => dispatch(selectItem(msg.id))} className="cursor-pointer">{msg.author.full_name}</td>
                              </tr>
                          : <tr key={i}>
                            <td colSpan={6}>
                              <ColorRing
                                  width = "100%"
                                  height = "50"
                                  wrapperStyle={{width: "100%"}}
                                />
                            </td>
                          </tr>
                            )
                          : <tr><td colSpan={6}>No crons available</td></tr>
                        : <tr>
                          <td colSpan={6}>
                            <Audio
                                width = "100%"
                                radius = "9"
                                color = 'green'
                                wrapperStyle={{width: "100%"}}
                              />
                            </td>
                          </tr>
                    }
                  </tbody>
                </table>
                <BottomPagination items={messages} fetchMethod={MessagesApi.getList} setKwargs={setKwargs} />

              </div>
            </div>
          </div>
        </div>
      </div>
      <EditModal />

    </div>
  )
}

export default Messages;
