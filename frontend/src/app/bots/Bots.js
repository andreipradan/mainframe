import React, { useEffect } from 'react'
import { useDispatch, useSelector } from "react-redux";
import BotsApi from "../../api/bots";
import {Audio, ColorRing} from "react-loader-spinner";
import {select} from "../../redux/botsSlice";
import EditModal from "./EditModal";
import Errors from "../shared/Errors";


const Bots = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results: bots, errors, loading, loadingBots} = useSelector(state => state.bots)

  useEffect(() => {
    !bots && dispatch(BotsApi.getList(token));
  }, []);


  const parseURL = str => {
    if (!str) return
    const url = new URL(str)
    let result = url.protocol + "//" + url.hostname
    result += url.pathname !== "/" ? "/(..)" + url.pathname.substring(url.pathname.length - 10) : url.pathname
    return result
  }

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Telegram Bots</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Bots</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available bots
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(BotsApi.getList(token))}>
                  <i className="mdi mdi-refresh" />
                </button>
              </h4>
              <Errors errors={errors}/>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Full Name </th>
                      <th> Webhook</th>
                      <th> Whitelist </th>
                      <th> Last call </th>
                      <th> Actions </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !loading
                        ? bots
                          ? bots.map(
                            (bot, i) => !loadingBots?.includes(bot.id)
                              ? <tr key={i}>
                                <td>{i + 1}</td>
                                <td>
                                  {bot.full_name} &nbsp;
                                  {
                                    !bot.is_active
                                      ? <i className="mdi mdi-exclamation" />
                                      : ""
                                  }
                                  <br />
                                  <small>({bot.username})</small></td>
                                <td>{bot.webhook_name || parseURL(bot.webhook) || "-"}</td>
                                <td>{bot.whitelist.join(", ")}</td>
                                <td>{
                                  bot.last_called_on
                                    ? new Date(bot.last_called_on).toLocaleDateString("ro-RO") + " " + new Date(bot.last_called_on).toLocaleTimeString("ro-RO")
                                    : "-"
                                }
                                </td>
                                <td>
                                  <div className="btn-group" role="group" aria-label="Basic example">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => dispatch(BotsApi.sync(token, bot.id))}
                                    >
                                      <i className="mdi mdi-refresh" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() => dispatch(select(bot.id))}
                                    >
                                      <i className="mdi mdi-pencil" />
                                    </button>
                                  </div>
                                </td>
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
                          : <tr><td colSpan={6}>No bots available</td></tr>
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

export default Bots;
