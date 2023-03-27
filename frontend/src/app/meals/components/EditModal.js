import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import {select} from "../../../redux/mealsSlice";
import {ColorRing} from "react-loader-spinner";
import MealsApi from "../../../api/meals";

const EditModal = () => {
  const dispatch = useDispatch();
  const meal = useSelector(state => state.meals.selectedMeal)
  const token = useSelector((state) => state.auth.token)
  const loadingMeals = useSelector(state => state.meals.loadingMeals)


  return <Modal centered show={!!meal} onHide={() => dispatch(select())}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 stretch-card">
            {meal?.name}
          </div>
        </div>
        <p className="text-muted mb-0">{meal?.date} - {meal?.type_verbose}</p>
      </Modal.Title>
    </Modal.Header>
    {
      loadingMeals?.includes(meal?.id)
      ? <ColorRing
          width = "100%"
          height = "50"
          wrapperStyle={{width: "100%"}}
        />
      : <Modal.Body>
        <div className="row">
          <div className="col-lg-6 grid-margin">
            <h5 className="mr-3">Ingredients</h5>
            <ul>
              {meal?.ingredients.map(ingredient => <li>{ingredient}</li>)}
            </ul>
          </div>
          <div className="col-lg-6 grid-margin">
            <h5 className="mr-3">Quantity</h5>
            <ul>
              {meal && Object.keys(meal.quantities).map(k => <li>{k} - {meal.quantities[k]}</li>)}
            </ul>
          </div>
          <div className="col-lg-12 grid-margin">
            <h5 className="mr-3">Nutritional Values</h5>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th> Plan </th>
                    <th> Median values / 100g </th>
                  </tr>
                </thead>
                <tbody>
                  {meal && Object.keys(meal.nutritional_values).map(k => <tr>
                    <td>{k}</td>
                    <td>{meal.nutritional_values[k]}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal.Body>
    }
    <Modal.Footer>
      <Button variant="danger" className="float-left" onClick={() => dispatch(MealsApi.delete(token, meal.id))}>
        Delete
      </Button>
      <Button variant="secondary" onClick={() => dispatch(select())}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;
