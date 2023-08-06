import React from "react";

const ListItem = props =>
  <div className={`d-flex d-sm-block d-md-flex align-items-center ${props.className}`}>
    <i className="mdi mdi-cash-multiple text-primary"></i>&nbsp;
    <h6 className="mb-0 text-muted">
      <span>{props.label}</span>: <span className={`text-${props.textType}`}>{props.value}</span>
      {
        props.tooltip && <sup>
          &nbsp;<i id={props.tooltip} className="mdi mdi-information-outline"/>
        </sup>
      }
    </h6>
  </div>
export default ListItem;
