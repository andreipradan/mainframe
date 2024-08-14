import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import { ColorRing } from "react-loader-spinner";
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'

import { selectItem as select } from "../../redux/mealsSlice";
import Alert from "react-bootstrap/Alert";
import EditModal from "../meals/components/EditModal";
import MealsApi from "../../api/meals";


const Meals = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const { errors, loading, results: meals} = useSelector(state => state.meals)
  const [alertOpen, setAlertOpen] = useState(false)
  const [dateRange, setDateRange] = useState(null)

   useEffect(() => {
    dateRange && dispatch(MealsApi.getList(token, dateRange.start, dateRange.end));
  }, [dateRange]);

  useEffect(() => {setAlertOpen(Boolean(errors))}, [errors])

  const renderEventContent = eventInfo => <><b>{eventInfo.timeText}</b><i>{eventInfo.event.title}</i></>

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
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(MealsApi.getList(token, dateRange.start, dateRange.end))}>
                  <i className="mdi mdi-refresh" />
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm p-0 border-0 bg-transparent" onClick={() => dispatch(MealsApi.sync(token))}>
                  <i className="mdi mdi-sync-alert" />
                </button>
              </h4>
              {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{errors}</Alert>}
              <FullCalendar
                firstDay="1"
                datesSet={(arg) => {
                  const start = arg.start.toISOString().split("T")[0]
                  const end = arg.end.toISOString().split('T')[0]
                  setDateRange({start, end})
                }}
                plugins={[dayGridPlugin]}
                eventClick={event => dispatch(select(parseInt(event.event.id)))}
                initialView='dayGridMonth'
                weekends
                events={meals?.map(meal => ({
                  id: meal.id,
                  title: meal.name.substring(0, 10) + "...",
                  start: new Date(meal.date + "T" + meal.time + ":00")
                }))}
                eventContent={renderEventContent}
              />
            </div>
          </div>
        </div>
      </div>
      <EditModal />
      {
        loading && <>
          <div className="fade modal-backdrop show">
            <ColorRing
              wrapperStyle={{
                top: "50%",
                left: "50%",
                width: "30em",
                height: "18em",
                marginTop: "-9em",
                marginLeft: "-10em",
                position: "fixed",
              }}
            />
          </div>
        </>
      }
    </div>
  )
}

export default Meals;
