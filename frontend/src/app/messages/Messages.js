import React, { useEffect } from 'react'
import { useDispatch, useSelector } from "react-redux";
import { Audio, ColorRing } from "react-loader-spinner";

import { selectItem, setModalOpen } from "../../redux/messagesSlice";
import MessagesApi from "../../api/messages";
import EditModal from "./components/EditModal";
import Errors from "../shared/Errors";


const Messages = () =>  {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token)
  const {results, errors, loading, loadingItems } = useSelector(state => state.messages)

  useEffect(() => {!results && dispatch(MessagesApi.getList(token))}, []);

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
              <h4 className="card-title">
                Saved messages
                <button
                    type="button"
                    className="btn btn-outline-success btn-sm border-0 bg-transparent"
                    onClick={() => dispatch(MessagesApi.getList(token))}
                >
                  <i className="mdi mdi-refresh"></i>
                </button>
              </h4>
              <Errors errors={errors}/>
              <div className="table-responsive">
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
                      !loading
                        ? results?.length
                          ? results.map(
                            (msg, i) => !loadingItems?.includes(msg.id)
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
