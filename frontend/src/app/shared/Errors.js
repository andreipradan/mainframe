import React, {useEffect, useState} from "react";
import Alert from "react-bootstrap/Alert";

const Errors = props => {
  const [alertOpen, setAlertOpen] = useState(false)
  useEffect(() => {setAlertOpen(Boolean(props.errors))}, [props.errors])

  return alertOpen
    ? <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>
      {
        props.errors?.detail
          ? <p className="text-danger">{props.errors.detail}</p>
          : props.errors?.length
            ? <ul className="text-danger">
              {props.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            : props.errors?.constructor === Object
              ? <ul>
                {
                  Object.keys(props.errors).map(k =>
                    props.errors[k]?.length
                      ? <ul>{props.errors[k].map((e, i) => <li key={i}>{e}</li> )}</ul>
                      : props.errors[k]
                  )
                }
                </ul>
              : props.errors

      }
    </Alert>
    : null
}
export default Errors
