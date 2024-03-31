import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import {Audio, ColorRing} from "react-loader-spinner";
import {selectItem, setModalOpen} from "../../redux/watchersSlice";
import EditModal from "../crons/components/EditModal";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Errors from "../shared/Errors";
import WatchersApi from "../../api/watchers";
import AceEditor from "react-ace";
import Form from "react-bootstrap/Form";


const Watchers = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results, errors, loading, loadingItems, selectedItem } = useSelector(state => state.watchers)

  const [cron, setCron] = useState("");
  const [isActive, setIsActive] = useState(selectedItem?.is_active || false);
  const [name, setName] = useState("");
  const [selector, setSelector] = useState("");
  const [url, setUrl] = useState("");

  const [latest, setLatest] = useState(null);
  const [latestAnnotations, setLatestAnnotations] = useState(null);

  const [request, setRequest] = useState(null);
  const [requestAnnotations, setRequestAnnotations] = useState(null);

  useEffect(() => {!results && dispatch(WatchersApi.getList(token))}, []);
  useEffect(() => {
    if (selectedItem) {
      setCron(selectedItem.cron)
      setIsActive(selectedItem.is_active)
      setLatest(JSON.stringify(selectedItem.latest, null, "\t"))
      setName(selectedItem.name)
      setRequest(JSON.stringify(selectedItem.request, null, "\t"))
      setSelector(selectedItem.selector)
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
                    onClick={() => dispatch(setModalOpen(true))}
                >
                  <i className="mdi mdi-plus"></i>
                </button>
              </h4>
              <Errors errors={errors}/>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Name </th>
                      <th> URL </th>
                      <th> Is Active? </th>
                      <th> Last updated </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !loading
                        ? results?.length
                          ? results.map(
                            (watcher, i) => !loadingItems?.includes(watcher.id)
                              ? <tr key={i} onClick={() => dispatch(selectItem(watcher.id))} >
                                <td className="cursor-pointer">{i + 1}</td>
                                <td className="cursor-pointer">{watcher.name}</td>
                                <td className="cursor-pointer">{watcher.url}</td>
                                <td className="cursor-pointer">
                                  <i className={`mdi mdi-${watcher.is_active ? "check text-success" : "alert text-danger"}`} />
                                </td>
                                <td className="cursor-pointer">
                                  {new Date(watcher.updated_at).toLocaleString()}
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
                          : <tr><td colSpan={6}>No watchers available</td></tr>
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
      <Modal centered show={!!selectedItem} onHide={() => dispatch(selectItem(null))}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                Edit {selectedItem?.name} watcher ?
                <button type="button"
                        className="btn btn-outline-success btn-sm border-0 bg-transparent"
                        onClick={() => dispatch(WatchersApi.getItem(token, selectedItem?.id))}>
                  <i className="mdi mdi-refresh"></i>
                </button>
              </div>
            </div>
            <p className="text-muted mb-0">Watcher details</p>
          </Modal.Title>
        </Modal.Header>
        {
          loadingItems?.includes(selectedItem?.id)
            ? <ColorRing
                width = "100%"
                height = "50"
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
            <Form.Label>URL</Form.Label>
            <Form.Control
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="custom-switch"
              label="Is Active"
              checked={isActive}
              onChange={() => {setIsActive(!isActive)}}
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
            <Form.Label>Selector</Form.Label>
            <Form.Control
              type="text"
              value={selector}
              onChange={e => setSelector(e.target.value)}
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
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            dispatch(selectItem(null))
          }}>Close</Button>
          <Button variant="primary" className="float-left" onClick={evt => {
            evt.preventDefault()
            dispatch(WatchersApi.run(token, selectedItem?.id))
          }}>
            <i className="mdi mdi-play" /> Run watcher
          </Button>
          <Button variant="success" disabled={!!requestAnnotations || !!latestAnnotations} onClick={() => {
            dispatch(WatchersApi.update(token, selectedItem?.id, {
              cron: cron,
              is_active: isActive,
              latest: JSON.parse(latest.replace(/[\r\n\t]/g, "")),
              name: name,
              requesst: JSON.parse(request.replace(/[\r\n\t]/g, "")),
              selector: selector,
            }))
          }}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Watchers;
