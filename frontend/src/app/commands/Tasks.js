import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Collapse } from 'react-bootstrap';
import { ColorRing } from 'react-loader-spinner';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import { capitalize } from '../utils';
import { selectItem } from '../../redux/tasksSlice';
import Errors from '../shared/Errors';
import TasksApi from '../../api/tasks';

const statusColors = {
  complete: 'success',
  executing: 'warning',
};

/** Returns the display color associated with a task status. */
const getStatusColor = (status) => statusColors[status] || 'danger';

export const parseStatus = (status) => (
  <span className={`text-${getStatusColor(status)}`}>{capitalize(status)}</span>
);

/** Renders the task table rows for loading, empty, and populated states. */
const TaskRows = ({ loading, results, onSelect }) => {
  if (loading) {
    return (
      <tr>
        <td colSpan={8}>
          <ColorRing
            width='100%'
            radius='9'
            color='green'
            wrapperStyle={{ width: '100%' }}
          />
        </td>
      </tr>
    );
  }

  if (!results?.length) {
    return (
      <tr>
        <td colSpan={7}>No tasks available</td>
      </tr>
    );
  }

  return results.map((task, i) => (
    <tr key={task.id}>
      <td>{i + 1}</td>
      <td>
        <button
          type='button'
          className='btn btn-link p-0 text-left'
          onClick={() => onSelect(task.id)}
        >
          {task.app}.{task.name}
        </button>
      </td>
      <td className='text-center'>
        {task.is_revoked ? <i className='mdi mdi-check text-danger' /> : null}
      </td>
      <td className='text-center'>
        {task.is_periodic ? <i className='mdi mdi-check text-success' /> : null}
      </td>
      {task.history?.length ? (
        <>
          <td className={`text-${getStatusColor(task.history[0].status)}`}>
            {task.history[0].status ? capitalize(task.history[0].status) : '-'}
          </td>
          <td>{new Date(task.history?.[0]?.timestamp).toLocaleString()}</td>
          <td>{task.history.length}</td>
          <td>{task.errors?.length}</td>
        </>
      ) : (
        <td colSpan={4} className='text-center'>
          Didn&apos;t run
        </td>
      )}
    </tr>
  ));
};

/** Renders expandable history or error details for a task. */
const TaskHistoryDetails = ({
  itemKey,
  selectedItem,
  isExpanded,
  onToggle,
}) => (
  <li key={itemKey}>
    <div>
      <button
        type='button'
        className='btn btn-link p-0'
        aria-expanded={isExpanded}
        aria-controls={`task-${selectedItem.id}-${itemKey}`}
        onClick={onToggle}
      >
        <i
          className={`mdi mdi-chevron-${isExpanded ? 'down text-success' : 'right text-primary'}`}
        />
        {capitalize(itemKey)} ({selectedItem[itemKey]?.length})
      </button>
      <Collapse in={isExpanded}>
        <ul id={`task-${selectedItem.id}-${itemKey}`} className='list-unstyled'>
          {selectedItem[itemKey].map((historyItem) => (
            <li
              key={historyItem.timestamp || JSON.stringify(historyItem)}
              className='pl-4 mt-1'
            >
              <i className='text-secondary mdi mdi-arrow-right mr-1' />
              {new Date(historyItem.timestamp).toLocaleString()}
              <ul className='list-unstyled'>
                {Object.keys(historyItem)
                  .filter((historyKey) => historyKey !== 'timestamp')
                  .map((historyKey) => (
                    <li key={historyKey} className='pl-3 mt-1'>
                      {capitalize(historyKey)}:{' '}
                      {historyKey === 'status'
                        ? parseStatus(historyItem.status)
                        : historyItem[historyKey]}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      </Collapse>
    </div>
  </li>
);

/** Renders one task detail field, including expandable nested data. */
const TaskDetailItem = ({
  itemKey,
  selectedItem,
  taskHistoryOpen,
  taskErrorsOpen,
  setTaskHistoryOpen,
  setTaskErrorsOpen,
}) => {
  if (itemKey === 'errors' || itemKey === 'history') {
    const isHistory = itemKey === 'history';
    const isExpanded = isHistory ? taskHistoryOpen : taskErrorsOpen;
    const setExpanded = isHistory ? setTaskHistoryOpen : setTaskErrorsOpen;

    return (
      <TaskHistoryDetails
        itemKey={itemKey}
        selectedItem={selectedItem}
        isExpanded={isExpanded}
        onToggle={() => setExpanded(!isExpanded)}
      />
    );
  }

  if (itemKey === 'is_periodic') {
    return (
      <li key={itemKey}>
        Is periodic:{' '}
        {selectedItem.is_periodic ? (
          <i className='mdi mdi-check text-success' />
        ) : (
          <i className='mdi mdi-close text-danger' />
        )}
      </li>
    );
  }

  if (itemKey === 'is_revoked') {
    return (
      <li key={itemKey}>
        Is revoked:{' '}
        {selectedItem.is_revoked ? (
          <i className='mdi mdi-check text-danger' />
        ) : (
          <i className='mdi mdi-close text-success' />
        )}
      </li>
    );
  }

  if (itemKey === 'status') {
    return <li key={itemKey}>Status: {parseStatus(selectedItem[itemKey])}</li>;
  }

  return (
    <li key={itemKey}>
      {capitalize(itemKey)}: {selectedItem[itemKey]}
    </li>
  );
};

/** Renders the available detail fields for the selected task. */
const TaskDetails = ({
  selectedItem,
  taskHistoryOpen,
  taskErrorsOpen,
  setTaskHistoryOpen,
  setTaskErrorsOpen,
}) => {
  if (!selectedItem) return null;

  return Object.keys(selectedItem)
    .filter((itemKey) => !['timestamp', 'name', 'app', 'id'].includes(itemKey))
    .map((itemKey) => (
      <TaskDetailItem
        key={itemKey}
        itemKey={itemKey}
        selectedItem={selectedItem}
        taskHistoryOpen={taskHistoryOpen}
        taskErrorsOpen={taskErrorsOpen}
        setTaskHistoryOpen={setTaskHistoryOpen}
        setTaskErrorsOpen={setTaskErrorsOpen}
      />
    ));
};

const Tasks = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const { errors, loading, loadingItems, results, selectedItem } = useSelector(
    (state) => state.tasks
  );
  const [taskErrorsOpen, setTaskErrorsOpen] = useState(false);
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(false);

  useEffect(() => {
    if (!results) dispatch(TasksApi.getList(token));
  }, []);

  return (
    <div>
      <div className='page-header'>
        <h3 className='page-title'>Tasks</h3>
        <nav aria-label='breadcrumb'>
          <ol className='breadcrumb'>
            <li className='breadcrumb-item'>
              <a href='!#' onClick={(event) => event.preventDefault()}>
                Home
              </a>
            </li>
            <li className='breadcrumb-item active' aria-current='page'>
              Tasks
            </li>
          </ol>
        </nav>
      </div>
      <div className='row'>
        <div className='col-lg-12 grid-margin stretch-card'>
          <div className='card'>
            <div className='card-body'>
              <h4 className='card-title'>
                Current tasks
                <button
                  type='button'
                  className='btn btn-outline-success btn-sm border-0 bg-transparent'
                  onClick={() => dispatch(TasksApi.getList(token))}
                >
                  <i className='mdi mdi-refresh' />
                </button>
              </h4>
              {!selectedItem && <Errors errors={errors} />}
              <div className='table-responsive'>
                <table className='table table-hover'>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Task</th>
                      <th className='text-center'>Is revoked?</th>
                      <th className='text-center'>Is periodic?</th>
                      <th>Status</th>
                      <th>Last Run</th>
                      <th>Events</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TaskRows
                      loading={loading}
                      results={results}
                      onSelect={(id) => dispatch(selectItem(id))}
                    />
                  </tbody>
                </table>
              </div>
              <Modal
                centered
                show={Boolean(selectedItem)}
                onHide={() => {
                  dispatch(selectItem(null));
                  setTaskErrorsOpen(false);
                  setTaskHistoryOpen(false);
                }}
                dialogClassName='min-vw-50'
              >
                <Modal.Header closeButton>
                  <Modal.Title>
                    <div className='row'>
                      <div className='col-lg-12 stretch-card'>
                        {selectedItem?.name}
                        <button
                          type='button'
                          className='btn btn-outline-success btn-sm border-0 bg-transparent'
                          onClick={() =>
                            dispatch(
                              TasksApi.getItem(
                                token,
                                selectedItem?.name,
                                selectedItem?.id
                              )
                            )
                          }
                        >
                          <i className='mdi mdi-refresh' />
                        </button>
                      </div>
                    </div>
                    <p className='text-muted mt-0 mb-0'>
                      App: {selectedItem?.app}{' '}
                    </p>
                    {selectedItem?.timestamp ? (
                      <p className='text-muted mt-0 mb-0'>
                        Last run:{' '}
                        {selectedItem?.timestamp
                          ? new Date(selectedItem.timestamp).toLocaleString()
                          : null}{' '}
                      </p>
                    ) : null}
                    <p className='text-muted mt-0 mb-0'>
                      ID: {selectedItem?.id}{' '}
                    </p>
                  </Modal.Title>
                </Modal.Header>
                {selectedItem && <Errors errors={errors} />}
                <Modal.Body>
                  {loadingItems?.includes(selectedItem?.id) ? (
                    <ColorRing
                      width='100%'
                      radius='9'
                      color='green'
                      wrapperStyle={{ width: '100%' }}
                    />
                  ) : (
                    <ul className='list-unstyled'>
                      <TaskDetails
                        selectedItem={selectedItem}
                        taskHistoryOpen={taskHistoryOpen}
                        taskErrorsOpen={taskErrorsOpen}
                        setTaskHistoryOpen={setTaskHistoryOpen}
                        setTaskErrorsOpen={setTaskErrorsOpen}
                      />
                    </ul>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant='secondary'
                    onClick={(e) => {
                      e.preventDefault();
                      dispatch(selectItem(null));
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    variant={selectedItem?.is_revoked ? 'success' : 'warning'}
                    className='float-left'
                    onClick={(evt) => {
                      evt.preventDefault();
                      dispatch(
                        TasksApi.revoke(
                          token,
                          selectedItem?.name,
                          selectedItem?.app,
                          selectedItem?.is_revoked ? 'restore' : 'revoke'
                        )
                      );
                    }}
                  >
                    {selectedItem?.is_revoked ? 'Restore' : 'Revoke'}
                  </Button>
                  <Button
                    variant='danger'
                    className='float-left'
                    onClick={(evt) => {
                      evt.preventDefault();
                      dispatch(
                        TasksApi.deleteHistory(token, selectedItem?.name)
                      );
                    }}
                  >
                    Delete history
                  </Button>
                </Modal.Footer>
              </Modal>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
