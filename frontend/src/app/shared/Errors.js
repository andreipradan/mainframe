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
          : props.errors?.constructor === Array
            ? <ul className="text-danger">
              {props.errors?.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            : props.errors?.constructor === Object
              ? <ul>
                {
                  Object.keys(props.errors)?.map((k, i) =>
                    props.errors?.[k]?.constructor === Array
                      ? <ul key={i}>{props.errors?.[k]?.map((e, i) => <li key={i}>{k}: {e}</li> )}</ul>
                      : <li>{props.errors?.[k]}</li>
                  )
                }
                </ul>
              : props.errors

      }
    </Alert>
    : null
}
export default Errors
