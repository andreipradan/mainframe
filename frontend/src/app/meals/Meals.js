import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import MealsApi from "../../api/meals";
import {Audio, ColorRing} from "react-loader-spinner";
import {select} from "../../redux/mealsSlice";
import Alert from "react-bootstrap/Alert";
import EditModal from "../meals/components/EditModal";


const Meals = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results: meals, errors, loading, loadingMeals } = useSelector(state => state.meals)
  const [alertOpen, setAlertOpen] = useState(false)

  useEffect(() => {
    !meals && dispatch(MealsApi.getList(token));
  }, []);

  useEffect(() => {setAlertOpen(!!errors)}, [errors])

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Meals</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Meals</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available meals
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(MealsApi.getList(token))}>
                  <i className="mdi mdi-refresh"></i>
                </button>
              </h4>
              {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{errors}</Alert>}
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Date </th>
                      <th> Type </th>
                      <th> Name </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !loading
                        ? meals?.length
                          ? meals.map(
                            (meal, i) => !loadingMeals?.includes(meal.id)
                              ? <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{new Date(meal.date).toLocaleDateString()} &nbsp;</td>
                                <td>{meal.type_verbose }</td>
                                <td>{meal.name}</td>
                                <td>
                                  <div className="btn-group" role="group" aria-label="Basic example">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() => dispatch(select(meal.id))}
                                    >
                                      <i className="mdi mdi-pencil"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                          : <tr key={i}>
                            <td colSpan={6}>
                              <ColorRing
                                  width = "100%"
                                  height = "50"
                                  wrapperStyle={{width: "100%"}}
                                />
                            </td>
                          </tr>
                            )
                          : <tr><td colSpan={6}>No meals available</td></tr>
                        : <tr>
                          <td colSpan={6}>
                            <Audio
                                width = "100%"
                                radius = "9"
                                color = 'green'
                                wrapperStyle={{width: "100%"}}
                              />
                            </td>
                          </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EditModal />
    </div>
  )
}

export default Meals;
