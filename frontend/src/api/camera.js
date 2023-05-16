import axios from "./index";
import {
  add,
  set,
  setCurrentFile,
  setErrors,
  setLoading,
} from "../redux/cameraSlice";
import {handleErrors} from "./errors";


class CameraApi {
  static getFile = (token, filename) => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/file/?filename=${filename}`, {
        headers: { Authorization: token },
        responseType: 'arraybuffer',
      })
      .then((response) => {
        dispatch(setCurrentFile({contents: Buffer.from(response.data, "binary").toString("base64"), name: filename}))
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, page = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static takePicture = (token) => dispatch => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/picture/`,{}, { headers: { Authorization: token } })
      .then(response => dispatch(add({"name": response.data.filename, "is_file": true})))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
}

let base = "camera";

export default CameraApi;
