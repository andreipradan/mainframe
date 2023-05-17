import axios from "./index";
import {
  add,
  set,
  setErrors,
  setLoading,
} from "../redux/cameraSlice";
import {handleErrors} from "./errors";


class CameraApi {
  static getList = (token, path = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/` + (path ? `?path=${path}` : ""), { headers: { Authorization: token } })
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
