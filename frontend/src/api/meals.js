import axios from "./index";
import {
  deleteMeal,
  set,
  setErrors,
  setLoading,
  setLoadingMeal,
  update,
} from "../redux/mealsSlice";
import {handleErrors} from "./errors";


class MealsApi {
  static delete = (token, mealId) => dispatch => {
    dispatch(setLoadingMeal(mealId));
    axios
      .delete(`${base}${mealId}/`, { headers: { Authorization: token } })
      .then(() => dispatch(deleteMeal(mealId)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, page = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base + `?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static updateMeal = (token, mealId, data) => dispatch => {
    dispatch(setLoadingMeal(mealId));
    axios
      .patch(`${base}${mealId}/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "meals/";

export default MealsApi;
