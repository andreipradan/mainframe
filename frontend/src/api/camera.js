import axios from "./index";
import {
  setErrors,
  setLoading,
} from "../redux/livecamSlice";
import {handleErrors} from "./errors";


class CameraApi {
  static streaming = (token, action) => dispatch => {
    dispatch(setLoading(true));
    axios
      .post(`${base}/streaming/`, {"action": action}, { headers: { Authorization: token } })
      .then(response => console.log(response.data))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
}

let base = "camera";

export default CameraApi;
