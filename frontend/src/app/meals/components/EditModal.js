import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import { selectItem as select } from "../../../redux/mealsSlice";

const EditModal = () => {
  const dispatch = useDispatch();
  const meal = useSelector(state => state.meals.selectedItem)

  return <Modal centered show={Boolean(meal)} onHide={() => dispatch(select())}>
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
    <Modal.Body>
      <div className="row">
        <div className="col-lg-6 grid-margin">
          <h5 className="mr-3">Ingredients</h5>
          <ul>
            {meal?.ingredients.map((ingredient, i) => <li key={i}>{ingredient}</li>)}
          </ul>
        </div>
        <div className="col-lg-6 grid-margin">
          <h5 className="mr-3">Quantity</h5>
          <ul>
            {meal && Object.keys(meal.quantities).map((k, i) => <li key={i}>{k} - {meal.quantities[k]}</li>)}
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
                {meal && Object.keys(meal.nutritional_values).map((k, i) => <tr key={i}>
                  <td>{k}</td>
                  <td>{meal.nutritional_values[k]}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={() => dispatch(select())}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;
