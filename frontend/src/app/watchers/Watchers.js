import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";

import AceEditor from "react-ace";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { Audio, ColorRing } from "react-loader-spinner";
import { Collapse } from "react-bootstrap";

import EditModal from "../crons/components/EditModal";
import Errors from "../shared/Errors";
import WatchersApi from "../../api/watchers";
import { capitalize } from "../finances/Accounts/AccountDetails/AccountDetails";
import { parseStatus } from "../tasks/Tasks";
import { selectItem, setModalOpen } from "../../redux/watchersSlice";


const Watchers = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results, errors, loading, loadingItems, modalOpen, selectedItem } = useSelector(state => state.watchers)

  const [chatId, setChatId] = useState("");
  const [cron, setCron] = useState("");
  const [name, setName] = useState("");
  const [selector, setSelector] = useState("");
  const [top, setTop] = useState(selectedItem?.top || true);
  const [url, setUrl] = useState("");

  const [latest, setLatest] = useState(null);
  const [latestAnnotations, setLatestAnnotations] = useState(null);

  const [request, setRequest] = useState(null);
  const [requestAnnotations, setRequestAnnotations] = useState(null);

  const [taskErrorsOpen, setTaskErrorsOpen] = useState(false)
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(false)

  useEffect(() => {!results && dispatch(WatchersApi.getList(token))}, []);
  useEffect(() => {
    if (selectedItem) {
      setChatId(selectedItem.chat_id || "")
      setCron(selectedItem.cron)
      setLatest(JSON.stringify(selectedItem.latest, null, "\t"))
      setName(selectedItem.name)
      setRequest(JSON.stringify(selectedItem.request, null, "\t"))
      setSelector(selectedItem.selector)
      setTop(selectedItem.top)
      setUrl(selectedItem.url)
    }
  }, [selectedItem]);

  const onLatestChange = (e, i) => {
    setLatest(e)
    try {
      JSON.parse(e)
      setLatestAnnotations(null)
    }
    catch (error) {
      const annotation = {...i.end, text: error.message, type: 'error'}
      setLatestAnnotations(!latestAnnotations ? [annotation] : [...latestAnnotations, annotation])
    }
  }
  const onRequestChange = (e, i) => {
    setRequest(e)
    try {
      JSON.parse(e)
      setRequestAnnotations(null)
    }
    catch (error) {
      const annotation = {...i.end, text: error.message, type: 'error'}
      setRequestAnnotations(!requestAnnotations ? [annotation] : [...requestAnnotations, annotation])
    }
  }

  const clearModal = () => {
    setChatId("")
    setCron("* * * * *")
    setLatest("{}")
    setName("")
    setRequest("{}")
    setSelector("")
    setTop(true)
    setUrl("")
  }
  const closeModal = () => {
    dispatch(selectItem())
    dispatch(setModalOpen(false))
    clearModal()
  }
  const duplicate = watcher => {
    setChatId(watcher.chat_id || "")
    setCron(watcher.cron)
    setLatest(JSON.stringify(watcher.latest, null, "\t"))
    setName(watcher.name)
    setRequest(JSON.stringify(watcher.request, null, "\t"))
    setSelector(watcher.selector)
    setTop(watcher.top)
    setUrl(watcher.url)
  }

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Watchers</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Crons</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available watchers
                <button
                    type="button"
                    className="btn btn-outline-success btn-sm border-0 bg-transparent"
                    onClick={() => dispatch(WatchersApi.getList(token))}
                >
                  <i className="mdi mdi-refresh"></i>
                </button>
                <button
                    type="button"
                    className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                    onClick={() => {
                      clearModal()
                      dispatch(setModalOpen(true))
                    }}
                >
                  <i className="mdi mdi-plus"></i>
                </button>
              </h4>
              {!selectedItem && !modalOpen ? <Errors errors={errors}/> : null}

              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Name </th>
                      <th> Cron </th>
                      <th> URL </th>
                      <th> Last check </th>
                      <th> Last status </th>
                      <th> Last update </th>
                      <th> Actions </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !loading
                        ? results?.length
                          ? results.map(
                            (watcher, i) => !loadingItems?.includes(watcher.id)
                              ? <tr key={i}>
                                <td className="cursor-pointer" onClick={() => dispatch(selectItem(watcher.id))}>{i + 1}</td>
                                <td className="cursor-pointer" onClick={() => dispatch(selectItem(watcher.id))}>{watcher.name}</td>
                                <td className="cursor-pointer" onClick={() => dispatch(selectItem(watcher.id))}>{watcher.cron}</td>
                                <td><a href={watcher.url} target="_blank">{watcher.url}</a></td>
                                <td className="cursor-pointer" onClick={() => dispatch(selectItem(watcher.id))}>
                                  {
                                    watcher.redis.history?.[0]?.timestamp
                                      ? new Date(watcher.redis.history[0].timestamp).toLocaleString()
                                      : "-"
                                  }
                                </td>
                                <td
                                  className={
                                    `text-${
                                      watcher.redis.history?.[0]?.status === "complete"
                                        ? 'success'
                                        : watcher.redis.history?.[0]?.status === "executing"
                                          ? 'warning' : 'danger'
                                    }`
                                  }
                                  onClick={() => dispatch(selectItem(watcher.id))}
                                >
                                  {watcher.redis.history?.[0]?.status ? capitalize(watcher.redis.history[0].status) : "-"}
                                </td>
                                <td className="cursor-pointer" onClick={() => dispatch(selectItem(watcher.id))}>
                                  {watcher.latest?.timestamp ? new Date(watcher.latest.timestamp).toLocaleString() : "-"}
                                </td>
                                <td>
                                  <i
                                    onClick={() => {duplicate(watcher);dispatch(setModalOpen(true))}}
                                    className="cursor-pointer mdi mdi-content-copy"
                                  />
                                  <i
                                    onClick={() => dispatch(WatchersApi.run(token, watcher?.id))}
                                    className="ml-1 cursor-pointer mdi mdi-play text-primary"
                                  />
                                </td>
                              </tr>
                              : <tr key={i}>
                                <td colSpan={8}>
                                  <ColorRing
                                    width="100%"
                                    height="50"
                                    wrapperStyle={{width: "100%"}}
                                  />
                            </td>
                          </tr>
                            )
                          : <tr><td colSpan={8}>No watchers available</td></tr>
                        : <tr>
                          <td colSpan={8}>
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
      <Modal centered show={!!selectedItem || modalOpen} onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 stretch-card">
                {selectedItem ? "Edit" : "Add"} {selectedItem?.name} watcher?
                {
                  selectedItem
                    ? <button
                        type="button"
                        className="btn btn-outline-success btn-sm border-0 bg-transparent"
                        onClick={() => dispatch(WatchersApi.getItem(token, selectedItem?.id))}
                      >
                        <i className="mdi mdi-refresh"></i>
                      </button>
                    : null
                }
              </div>
            </div>
            {
              selectedItem && Object.keys(selectedItem.redis).length
                ? <>
                  <p className="text-muted mb-0">Previous runs</p>
                  <ul className="mb-0 list-unstyled text-muted">
                    {
                      selectedItem?.redis
                        ? Object.keys(selectedItem?.redis).map((k, i) =>
                          ["errors", "history"].includes(k)
                            ? <li key={i}>
                              {
                                <div>
                                  <div
                                    style={{cursor: "pointer"}}
                                    onClick={() =>
                                      k === "history"
                                        ? setTaskHistoryOpen(!taskHistoryOpen)
                                        : setTaskErrorsOpen(!taskErrorsOpen)}
                                  >
                                    <i
                                      className={`mdi mdi-chevron-${(k === "history" ? taskHistoryOpen : taskErrorsOpen) ? 'down text-success' : 'right text-primary'}`}/>
                                    {capitalize(k)} ({selectedItem?.redis[k]?.length})
                                  </div>
                                  <Collapse
                                    in={k === "history" ? taskHistoryOpen : taskErrorsOpen}>
                                    <ul className="list-unstyled">
                                      {
                                        selectedItem?.redis[k].map((h, i) =>
                                          <li key={i} className="pl-4 mt-1">
                                            <i
                                              className="text-secondary mdi mdi-arrow-right mr-1"/>
                                            {new Date(h.timestamp).toLocaleString()}
                                            <ul className="list-unstyled">
                                              {Object.keys(h).filter(k => k !== "timestamp").map((hkey, hi) =>
                                                <li key={hi} className="pl-3">{capitalize(hkey)}: {hkey === "status" ? parseStatus(h.status) : h[hkey]}</li>)}
                                            </ul>
                                          </li>
                                        )
                                      }
                                    </ul>
                                  </Collapse>
                                </div>
                              }
                            </li>
                            : k === "status"
                              ? <li key={i}>Last status: {selectedItem?.redis[k]}</li>
                              : <li key={i}>{capitalize(k)}: {selectedItem?.redis[k]}</li>
                        )
                        : null
                    }
                    {
                      selectedItem?.redis?.history?.[0]?.timestamp
                        ? <li>Last
                          check: {new Date(selectedItem.redis.history[0].timestamp).toLocaleString()}</li>
                        : null
                    }
                    {
                      selectedItem?.redis?.history?.[0]?.status
                        ? <li>Last
                          status: {parseStatus(selectedItem.redis.history[0].status)}</li>
                        : null
                    }
                  </ul>
                </>
                : null
            }
          </Modal.Title>
        </Modal.Header>
        {
          loadingItems?.includes(selectedItem?.id)
            ? <ColorRing
              width="100%"
              height="50"
              wrapperStyle={{width: "100%"}}
            />
            : <Modal.Body>
              <Errors errors={errors}/>

              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Chat Id</Form.Label>
                <Form.Control
                  type="text"
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Cron</Form.Label>
                <Form.Control
                  type="text"
                  value={cron}
                  onChange={e => setCron(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>URL</Form.Label>
                <Form.Control
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Selector</Form.Label>
                <Form.Control
                  type="text"
                  value={selector}
                  onChange={e => setSelector(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="top-switch"
                  label="Top search"
                  checked={top}
                  onChange={() => {setTop(!top)}}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Latest data</Form.Label>
                <AceEditor
                  className={(latestAnnotations) ? "form-control is-invalid" : ""}
                  annotations={latestAnnotations}
                  placeholder="Latest data"
                  mode="json"
                  theme="monokai"
                  onChange={onLatestChange}
                  fontSize={12}
                  showPrintMargin={true}
                  showGutter={true}
                  highlightActiveLine={true}
                  value={latest}
                  setOptions={{
                    enableBasicAutocompletion: false,
                    enableLiveAutocompletion: false,
                    enableSnippets: false,
                    showLineNumbers: true,
                    tabSize: 2,
                    wrap: true
                  }}
                  width="100%"
                  height="100px"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Request parameters</Form.Label>
                <AceEditor
                  className={(requestAnnotations) ? "form-control is-invalid" : ""}
                  annotations={requestAnnotations}
                  placeholder="Request parameters"
                  mode="json"
                  theme="monokai"
                  onChange={onRequestChange}
                  fontSize={12}
                  showPrintMargin={true}
                  showGutter={true}
                  highlightActiveLine={true}
                  value={request}
                  setOptions={{
                    enableBasicAutocompletion: false,
                    enableLiveAutocompletion: false,
                    enableSnippets: false,
                    showLineNumbers: true,
                    tabSize: 2,
                  }}
                  width="100%"
                  height="100px"
                />
              </Form.Group>
            </Modal.Body>
        }

        <Modal.Footer>
          {
            selectedItem
              ? <Button variant="danger" onClick={() => dispatch(WatchersApi.delete(token, selectedItem.id))}>
                  Delete
                </Button>
              : null
          }
          <Button
            variant="outline-warning"
            disabled={!url || !selector}
            onClick={() => dispatch(WatchersApi.test(token, url, selector))}
          >
            Test
          </Button>
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            dispatch(selectItem(null))
          }}>Close</Button>
          {
            selectedItem
              ? <>
                  <Button variant="primary"
                    disabled={!!requestAnnotations || !!latestAnnotations}
                    onClick={() => {
                      dispatch(WatchersApi.update(token, selectedItem?.id, {
                        chat_id: chatId || null,
                        cron: cron,
                        latest: JSON.parse(latest.replace(/[\r\n\t]/g, "")),
                        name: name,
                        request: JSON.parse(request.replace(/[\r\n\t]/g, "")),
                        selector: selector,
                        top: top,
                        url: url,
                      }))
                  }}>
                    Save Changes
                  </Button>
                </>
              : <Button variant="primary"
                  disabled={!!requestAnnotations || !!latestAnnotations}
                  onClick={() => {
                    dispatch(WatchersApi.create(token, {
                      chat_id: chatId || null,
                      cron: cron,
                      latest: JSON.parse(latest.replace(/[\r\n\t]/g, "")),
                      name: name,
                      request: JSON.parse(request.replace(/[\r\n\t]/g, "")),
                      selector: selector,
                      top: top,
                      url: url,
                    }))
                }}>
                  Create
                </Button>
          }
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Watchers;
