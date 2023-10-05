import React from 'react';
import {useHistory} from "react-router-dom";

const Expenses = () => {
  const history = useHistory();
  return (
    <div>
      <div className="d-flex align-items-center text-center error-page bg-primary pt-5 pb-4 h-100">
        <div className="row flex-grow">
          <div className="col-lg-8 mx-auto text-white">
            <div className="row align-items-center d-flex flex-row">
              <div className="col-lg-12 error-page-divider text-lg-center pl-lg-4">
                <h2>Coming soon</h2>
              </div>
            </div>
            <div className="row mt-5">
              <div className="col-12 text-center mt-xl-2">
                <button className="btn text-white font-weight-medium" onClick={history.goBack}>Go back</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Expenses
