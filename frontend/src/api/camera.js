import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/cameraSlice";
import {handleErrors} from "./errors";


class CameraApi {
  static deleteImage = (token, filename) => dispatch => {
    dispatch(setLoading(true));
    axios
      .delete(`${base}/delete/?filename=${filename}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static downloadImage = (token, filename) => dispatch => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/download/?filename=${filename}`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
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

let base = "camera";

export default CameraApi;
