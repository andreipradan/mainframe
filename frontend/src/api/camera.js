import axios from "./index";
import {
  download,
  set,
  setErrors,
  setLoading, setLoadingFiles,
} from "../redux/cameraSlice";
import {handleErrors} from "./errors";


class CameraApi {
  static createFolder = (token, folder) => dispatch => {
    dispatch(setLoadingFiles(folder));
    axios
      .put(`${base}/create-folder/?folder=${folder}`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static deleteFolder = (token, folder) => dispatch => {
    dispatch(setLoadingFiles(folder));
    axios
      .delete(`${base}/delete-folder/?folder=${folder}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static deleteImage = (token, filename) => dispatch => {
    dispatch(setLoadingFiles(filename));
    axios
      .delete(`${base}/delete/?filename=${filename}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static downloadImage = (token, filename) => dispatch => {
    dispatch(setLoadingFiles(filename));
    axios
      .put(`${base}/download/?filename=${filename}`, {}, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(download({data: response.data, filename}))
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, path = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/` + (path ? `?path=${path}` : ""), { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

const base = "camera";

export default CameraApi;
