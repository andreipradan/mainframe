import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { Circles } from "react-loader-spinner";
import { Collapse } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import "nouislider/distribute/nouislider.css";

import { TimetableApi } from "../../../../api/finance";
import { selectItem as selectTimetable } from "../../../../redux/timetableSlice";
import TimetableEditModal from "./components/TimetableEditModal";
import Errors from "../../../shared/Errors";

const Timetables = () => {
  const history = useHistory()
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)
  const timetable = useSelector(state => state.timetable)

  const api = new TimetableApi(token)

  const [fileError, setFileError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const handleFileChange = e => {
    if (!e.target.files[0].name.endsWith(".pdf"))
      setFileError("File must be pdf!")
    else {
      setSelectedFile(e.target.files[0]);
      setFileError(null)
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('file', selectedFile);
    dispatch(api.upload(formData))
    setUploadOpen(false)
    setSelectedFile(null)
  };

  useEffect(() => setUploadOpen(Boolean(timetable.errors)), [timetable.errors]);

  useEffect(() => {!timetable.results && dispatch(api.getList())}, []);

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Timetables
        <button
          type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(api.getList())}
        >
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item"><a href="/finances/credit/details" onClick={event => {
            event.preventDefault()
            history.push("/finances/credit/details")
          }}>Credit</a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">Timetables</li>
        </ol>
      </nav>
    </div>
    <div className="row">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm border-0 bg-transparent float-right"
                onClick={() => setUploadOpen(!uploadOpen)}
              >
                <i className="mdi mdi-upload" />
              </button>
              <Collapse in={uploadOpen}>
                <Form onSubmit={handleSubmit} className="form-inline">
                  <Form.Group>
                    {fileError ? <Errors errors={[fileError]} /> : null}

                    <div className="custom-file">
                      <Form.Control
                        type="file"
                        className="form-control visibility-hidden"
                        id="customFileLang"
                        lang="es"
                        onChange={handleFileChange}
                      />
                      <label className="custom-file-label" htmlFor="customFileLang">
                        {selectedFile ? selectedFile.name : 'Select a file'}
                      </label>
                    </div>
                  </Form.Group>
                  <button
                    disabled={!selectedFile}
                    type="submit"
                    className="btn btn-outline-warning ml-3 btn-sm"
                  >
                    <i className="mdi mdi-upload" /> Upload
                  </button>
                </Form>
              </Collapse>

            </h4>
            <div className="table-responsive">
              <Errors errors={timetable.errors} />
              <div className="mb-0 text-muted">Total: {timetable.count}</div>
              <table className="table table-hover">
                <thead>
                <tr>
                <th> Date </th>
                    <th> Interest </th>
                    <th> Margin </th>
                    <th> IRCC </th>
                    <th> Months </th>
                  </tr>
                </thead>
                <tbody>
                {
                  timetable.loading
                    ? <Circles
                        visible
                        width="100%"
                        ariaLabel="ball-triangle-loading"
                        wrapperStyle={{float: "right"}}
                        color='orange'
                      />
                    : timetable.results?.length
                        ? timetable.results.map(t =>
                          <tr
                            key={t.id}
                            onClick={() => dispatch(selectTimetable(t.id))}
                            className={"cursor-pointer"}
                          >
                            <td> {t.date} </td>
                            <td> {t.interest}% </td>
                            <td> {t.margin}% </td>
                            <td> {t.ircc}% </td>
                            <td> {t.amortization_table.length} </td>
                          </tr>)
                      : <tr><td colSpan={6}><span>No timetables found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <TimetableEditModal />
  </div>
}

export default Timetables;