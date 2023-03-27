import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import {Audio, ColorRing} from "react-loader-spinner";
import {select} from "../../redux/mealsSlice";
import Alert from "react-bootstrap/Alert";
import EditModal from "../meals/components/EditModal";
import MealsApi from "../../api/meals";


const Meals = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {count, errors, loading, loadingMeals, next, previous, results: meals} = useSelector(state => state.meals)
  const [alertOpen, setAlertOpen] = useState(false)

  const currentPage = !previous ? 1 : (parseInt(new URL(previous).searchParams.get("page")) || 1) + 1
  const lastPage = Math.ceil(count / meals?.length)

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
              <div className="center-content btn-group mt-4 mr-4" role="group" aria-label="Basic example">
                <button
                  type="button"
                  className="btn btn-default"
                  disabled={!previous}
                  onClick={() => dispatch(MealsApi.getList(token, 1))}
                >
                  <i className="mdi mdi-skip-backward"/>
                </button>

                {
                  !next && currentPage - 2 > 0 &&
                  <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => dispatch(MealsApi.getList(token, currentPage - 2))}
                  >
                    {currentPage - 2}
                  </button>
                }
                {
                  previous &&
                  <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => dispatch(MealsApi.getList(token, currentPage - 1))}
                  >
                    {currentPage - 1}
                  </button>
                }
                <button
                  type="button"
                  className="btn btn-default"
                  disabled
                >
                  {currentPage}
                </button>
                {
                  next &&
                  <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => dispatch(MealsApi.getList(token, currentPage + 1))}
                  >
                    {currentPage + 1}
                  </button>
                }
                {
                  !previous && currentPage + 2 < lastPage &&
                  <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => dispatch(MealsApi.getList(token, currentPage + 2))}
                  >
                    {currentPage + 2}
                  </button>
                }
                <button
                  type="button"
                  className="btn btn-default"
                  disabled={!next}
                  onClick={() => dispatch(MealsApi.getList(token, lastPage))}
                >
                  <i className="mdi mdi-skip-forward"/>
                </button>
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
