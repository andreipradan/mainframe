import React, {useEffect, useState} from "react";
import Alert from "react-bootstrap/Alert";

const Errors = props => {
  const [alertOpen, setAlertOpen] = useState(false)

  const renderErrors = err => {
    if (!err) return null
    if (typeof err === "string") return <p className="text-danger">{err}</p>
    if (Array.isArray(err)) return (
      <ul className="text-danger">
        {err.map((e, i) => (
          <li key={i}>{renderErrors(e)}</li>
        ))}
      </ul>)
    if (typeof err === "object") {
      return (
        <ul className="text-danger">
          {Object.entries(err).map(([key, value], i) => (
            <li key={i}>
              {typeof value === "string" ? `${key}: ${value}` : `${key}:`}
              {Array.isArray(value) || typeof value === "object" ? renderErrors(value) : null}
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-danger">{String(err)}</p>
  }

  useEffect(() => {setAlertOpen(Boolean(props.errors))}, [props.errors])

  return alertOpen
    ? <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>
        {renderErrors(props.errors)}
      </Alert>
    : null
}
export default Errors
