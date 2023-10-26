import React from "react";

const ListItem = props =>
  <div className={`d-flex d-sm-block d-md-flex align-items-center ${props.className}`}>
    <i className="mdi mdi-cash-multiple text-primary"></i>&nbsp;
    <h6 className="mb-0 text-muted">
      <span>{props.label}</span>:&nbsp;
      <span className={`text-${props.textType}`}>
        {
          !props.datetime
            ? props.value
            : `${new Date(props.value).toLocaleDateString()} @ ${new Date(props.value).toLocaleTimeString()}`
        }
      </span>
      {
        props.tooltip && <sup>
          &nbsp;<i id={props.tooltip} className="mdi mdi-information-outline"/>
        </sup>
      }
    </h6>
  </div>
export default ListItem;
