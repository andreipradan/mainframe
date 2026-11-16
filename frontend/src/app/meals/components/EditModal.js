import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';
import { selectItem as select } from '../../../redux/mealsSlice';

/** Displays the selected meal's name, date, and type in the modal header. */
const MealModalTitle = ({ meal }) => (
  <Modal.Title>
    <div className='row'>
      <div className='col-lg-12 stretch-card'>{meal?.name}</div>
    </div>
    <p className='text-muted mb-0'>
      {meal?.date} - {meal?.type_verbose}
    </p>
  </Modal.Title>
);

/** Renders a titled list of meal ingredients or quantities. */
const MealListSection = ({ title, items, renderItem }) => (
  <div className='col-lg-6 grid-margin'>
    <h5 className='mr-3'>{title}</h5>
    <ul>{items.map(renderItem)}</ul>
  </div>
);

/** Renders the selected meal's nutritional values in a data table. */
const NutritionalValuesTable = ({ meal }) => (
  <table className='table'>
    <thead>
      <tr>
        <th> Plan </th>
        <th> Median values / 100g </th>
      </tr>
    </thead>
    <tbody>
      {Object.keys(meal.nutritional_values).map((key) => (
        <tr key={key}>
          <td>{key}</td>
          <td>{meal.nutritional_values[key]}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** Wraps the nutritional values table in its responsive section. */
const MealNutritionalValues = ({ meal }) => (
  <div className='col-lg-12 grid-margin'>
    <h5 className='mr-3'>Nutritional Values</h5>
    <div className='table-responsive'>
      {meal && <NutritionalValuesTable meal={meal} />}
    </div>
  </div>
);

/** Shows the selected meal's ingredients, quantities, and nutrition table. */
const MealDetailsBody = ({ meal }) => (
  <Modal.Body>
    <div className='row'>
      <MealListSection
        title='Ingredients'
        items={meal?.ingredients ?? []}
        renderItem={(ingredient) => <li key={ingredient}>{ingredient}</li>}
      />
      <MealListSection
        title='Quantity'
        items={Object.keys(meal?.quantities ?? {})}
        renderItem={(key) => (
          <li key={key}>
            {key} - {meal.quantities[key]}
          </li>
        )}
      />
      <MealNutritionalValues meal={meal} />
    </div>
  </Modal.Body>
);

/** Displays meal details and dispatches the selection clear action on close. */
const EditModal = () => {
  const dispatch = useDispatch();
  const meal = useSelector((state) => state.meals.selectedItem);
  /** Clears the selected meal when the modal closes. */
  const closeModal = () => dispatch(select());

  return (
    <Modal centered show={Boolean(meal)} onHide={closeModal}>
      <Modal.Header closeButton>
        <MealModalTitle meal={meal} />
      </Modal.Header>
      <MealDetailsBody meal={meal} />
      <Modal.Footer>
        <Button variant='secondary' onClick={closeModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditModal;
