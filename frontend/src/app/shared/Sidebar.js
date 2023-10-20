import React, { useEffect, useState } from 'react';
import {Link, useHistory, useLocation, withRouter} from 'react-router-dom';
import {Collapse, Dropdown, Row} from 'react-bootstrap';
import { Trans } from 'react-i18next';
import {useDispatch, useSelector} from "react-redux";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import RpiApi from "../../api/rpi";
import Alert from "react-bootstrap/Alert";
import {Circles} from "react-loader-spinner";
import logo from "../../assets/images/logo.svg"
import logoMini from "../../assets/images/logo-mini.svg"


const Sidebar = () => {
  const dispatch = useDispatch()
  const location = useLocation();
  const history = useHistory();

  const token = useSelector((state) => state.auth.token)
  const user = useSelector((state) => state.auth.user)
  const {errors, loading, message} = useSelector(state => state.rpi)

  const [alertOpen, setAlertOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentModal, setCurrentModal] = useState("")

  const [appsMenuOpen, setAppsMenuOpen] = useState(false)
  const [basicUiMenuOpen, setBasicUiMenuOpen] = useState(false)
  const [creditMenuOpen, setCreditMenuOpen] = useState(false)
  const [documentationMenuOpen, setDocumentationMenuOpen] = useState(false)
  const [expensesMenuOpen, setExpensesMenuOpen] = useState(false)
  const [financesMenuOpen, setFinancesMenuOpen] = useState(false)
  const [formElementsMenuOpen, setFormElementsMenuOpen] = useState(false)
  const [tablesMenuOpen, setTablesMenuOpen] = useState(false)
  const [iconsMenuOpen, setIconsMenuOpen] = useState(false)
  const [chartsMenuOpen, setChartsMenuOpen] = useState(false)
  const [userPagesMenuOpen, setUserPagesMenuOpen] = useState(false)
  const [errorPagesMenuOpen, setErrorPagesMenuOpen] = useState(false)

  useEffect(() => {setAlertOpen(!!errors)}, [errors])
  useEffect(() => {setMessageOpen(!!message)}, [message])

  useEffect(() => {
    onRouteChanged()
    const body = document.querySelector('body');
    document.querySelectorAll('.sidebar .nav-item').forEach((el) => {

      el.addEventListener('mouseover', function() {
        if(body.classList.contains('sidebar-icon-only')) {
          el.classList.add('hover-open');
        }
      });
      el.addEventListener('mouseout', function() {
        if(body.classList.contains('sidebar-icon-only')) {
          el.classList.remove('hover-open');
        }
      });
    });
  }, []);

  useEffect(() => {onRouteChanged()}, [location])

  const closeAllMenus = () => {
    setAppsMenuOpen(false)
    setBasicUiMenuOpen(false)
    setCreditMenuOpen(false)
    setExpensesMenuOpen(false)
    setFinancesMenuOpen(false)
    setFormElementsMenuOpen(false)
    setTablesMenuOpen(false)
    setIconsMenuOpen(false)
    setChartsMenuOpen(false)
    setUserPagesMenuOpen(false)
    setErrorPagesMenuOpen(false)
  }

  const onRouteChanged = () => {
    document.querySelector('#sidebar').classList.remove('active');
    closeAllMenus()

    const dropdownPaths = [
      {path:'/apps', setState: setAppsMenuOpen},
      {path:'/basic-ui', setState: setBasicUiMenuOpen},
      {path:'/expenses', setState: setExpensesMenuOpen},
      {path:'/finances', setState: setFinancesMenuOpen},
      {path:'/finances/credit', setState: setCreditMenuOpen},
      {path:'/form-elements', setState: setFormElementsMenuOpen},
      {path:'/tables', setState: setTablesMenuOpen},
      {path:'/icons', setState: setIconsMenuOpen},
      {path:'/charts', setState: setChartsMenuOpen},
      {path:'/login', setState: setUserPagesMenuOpen},
      {path:'/register', setState: setUserPagesMenuOpen},
      {path:'/error-pages', setState: setErrorPagesMenuOpen},
    ];

    dropdownPaths.forEach((obj => isPathActive(obj.path) && obj.setState(true)));

  }

  const isPathActive = path => location.pathname.startsWith(path)
  const isPathExact = path => location.pathname === path

  return (
    <nav className="sidebar sidebar-offcanvas" id="sidebar">
      <div className="sidebar-brand-wrapper d-none d-lg-flex align-items-center justify-content-center fixed-top">
        <a className="sidebar-brand brand-logo" href={user?.is_staff ? "/" : "/expenses"}><img src={logo} alt="logo" /></a>
        <a className="sidebar-brand brand-logo-mini" href={user?.is_staff ? "/" : "/expenses"}><img src={logoMini} alt="logo" /></a>
      </div>
      <ul className="nav">
        <li className="nav-item profile">
          <div className="profile-desc">
            <div className="profile-pic">
              <div className="count-indicator">
                <img className="img-xs rounded-circle " src={require('../../assets/images/faces/face15.jpg')} alt="profile" />
                <span className="count bg-success"></span>
              </div>
              <div className="profile-name">
                <h5 className="mb-0 font-weight-normal">
                  <Row>
                    {user?.username}&nbsp;
                    {loading && <Circles
                      visible={true}
                      height="15"
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{}}
                      wrapperClass={{}}
                      color='orange'
                      />}
                  </Row>
                </h5>
                <span>{new Date(user?.last_login).toLocaleString()}</span>
              </div>
            </div>
            <Dropdown alignRight>
              <Dropdown.Toggle as="a" className="cursor-pointer no-caret">
                <i className="mdi mdi-dots-vertical"></i>
              </Dropdown.Toggle>
              <Dropdown.Menu className="sidebar-dropdown preview-list">
                <a href="!#" className="dropdown-item preview-item" onClick={evt => {
                  evt.preventDefault()
                  history.push("/profile")
                }}>
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-settings text-primary"></i>
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1 text-small">Account settings</p>
                  </div>
                </a>
                <div className="dropdown-divider"></div>
                <a href="!#" className="dropdown-item preview-item" onClick={evt =>evt.preventDefault()}>
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-onepassword  text-info"></i>
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1 text-small"><Trans>Change Password</Trans></p>
                  </div>
                </a>
                {
                  user?.is_staff && <>
                    <div className="dropdown-divider"></div>
                    <a href="!#" className="dropdown-item preview-item" onClick={evt =>evt.preventDefault()}>
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-calendar-today text-success"></i>
                        </div>
                      </div>
                      <div className="preview-item-content">
                        <p className="preview-subject ellipsis mb-1 text-small"><Trans>To-do list</Trans></p>
                      </div>
                    </a>
                    <Dropdown.Divider/>
                    <Dropdown.Item href="!#" onClick={e => {
                      e.preventDefault()
                      setModalOpen(true)
                      setCurrentModal("clear build")
                    }} className="preview-item">
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-delete text-danger"></i>
                        </div>
                      </div>
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1"><Trans>Clear build</Trans></p>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Divider/>
                    <Dropdown.Item href="!#" onClick={e => {
                      e.preventDefault()
                      setModalOpen(true)
                      setCurrentModal("restart backend")
                    }} className="preview-item">
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-restart text-danger"></i>
                        </div>
                      </div>
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1"><Trans>Restart backend</Trans></p>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Divider/>
                    <Dropdown.Item href="!#" onClick={e => {
                      e.preventDefault()
                      setModalOpen(true)
                      setCurrentModal("reboot")
                    }} className="preview-item">
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-restart text-danger"></i>
                        </div>
                      </div>
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1"><Trans>Reboot</Trans></p>
                      </div>
                    </Dropdown.Item>
                  </>
                }
              </Dropdown.Menu>
            </Dropdown>
          </div>
          {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{errors}</Alert>}
          {messageOpen && <Alert variant="primary" dismissible onClose={() => setMessageOpen(false)}>{message}</Alert>}
        </li>
        {
          user?.is_staff
            ? <>
              <li className="nav-item nav-category"><span className="nav-link">Admin</span></li>
              <li className={ location.pathname === "/" ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                <Link className="nav-link" to="/">
                  <span className="menu-icon"><i className="mdi mdi-speedometer"></i></span>
                  <span className="menu-title"><Trans>Dashboard</Trans></span>
                </Link>
              </li>
              <li className={ isPathActive('/apps') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                <div className={ appsMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setAppsMenuOpen(!appsMenuOpen) } data-toggle="collapse">
                  <span className="menu-icon">
                    <i className="mdi mdi-chart-bar"></i>
                  </span>
                  <span className="menu-title"><Trans>Apps</Trans></span>
                  <i className="menu-arrow"></i>
                </div>
                <Collapse in={ appsMenuOpen }>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link className={ isPathActive('/apps/camera') ? 'nav-link active' : 'nav-link' } to="/apps/camera">
                          <Trans>Camera</Trans>
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={ isPathActive('/apps/logs') ? 'nav-link active' : 'nav-link' } to="/apps/logs">
                          <span className="menu-title"><Trans>Logs</Trans></span>
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={ isPathActive('/apps/todo') ? 'nav-link active' : 'nav-link' } to="/apps/todo">
                          <Trans>To do List</Trans>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={ isPathActive('/finances') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                <div className={ appsMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setFinancesMenuOpen(!financesMenuOpen) } data-toggle="collapse">
                  <span className="menu-icon">
                    <i className="mdi mdi-credit-card-outline"></i>
                  </span>
                  <span className="menu-title"><Trans>Finances</Trans></span>
                  <i className="menu-arrow"></i>
                </div>
                <Collapse in={ financesMenuOpen }>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link className={ isPathActive('/finances/accounts') ? 'nav-link active' : 'nav-link' } to="/finances/accounts">
                          Accounts
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={ isPathActive('/finances/calculator') ? 'nav-link active' : 'nav-link' } to="/finances/calculator">
                          Calculator
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={ isPathActive('/finances/categorize') ? 'nav-link active' : 'nav-link' } to="/finances/categorize">
                          Categorize
                        </Link>
                      </li>
                      <li className="nav-item">
                        <div className={ appsMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setCreditMenuOpen(!creditMenuOpen) } data-toggle="collapse">
                          <span>Credit</span><i className="menu-arrow" />
                        </div>
                        <Collapse in={ creditMenuOpen }>
                          <div>
                            <ul className="nav flex-column sub-menu pl-4">
                              <li className="nav-item">
                                <Link className={ isPathActive('/finances/credit/details') ? 'nav-link active' : 'nav-link' } to="/finances/credit/details">
                                  Details
                                </Link>
                              </li>
                              <li className="nav-item">
                                <Link className={ isPathActive('/finances/credit/payments') ? 'nav-link active' : 'nav-link' } to="/finances/credit/payments">
                                  Payments
                                </Link>
                              </li>
                              <li className="nav-item">
                                <Link className={ isPathActive('/finances/credit/timetables') ? 'nav-link active' : 'nav-link' } to="/finances/credit/timetables">
                                  Timetables
                                </Link>
                              </li>
                            </ul>
                          </div>
                        </Collapse>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={ isPathActive('/bots') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                <Link className="nav-link" to="/bots">
                  <span className="menu-icon"><i className="mdi mdi-speedometer"></i></span>
                  <span className="menu-title"><Trans>Bots</Trans></span>
                </Link>
              </li>
              <li className={ isPathActive('/crons') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                <Link className="nav-link" to="/crons">
                  <span className="menu-icon"><i className="mdi mdi-timer"></i></span>
                  <span className="menu-title"><Trans>Crons</Trans></span>
                </Link>
              </li>
              <li className={ isPathActive('/devices') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                <Link className="nav-link" to="/devices">
                  <span className="menu-icon"><i className="mdi mdi-text"></i></span>
                  <span className="menu-title"><Trans>Devices</Trans></span>
                </Link>
              </li>
              <li className={ isPathActive('/users') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                <Link className="nav-link" to="/users">
                  <span className="menu-icon"><i className="mdi mdi-human" /></span>
                  <span className="menu-title">Users</span>
                </Link>
              </li>
              <li className={ isPathActive('/groups') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                <Link className="nav-link" to="/groups">
                  <span className="menu-icon"><i className="mdi mdi-account-multiple" /></span>
                  <span className="menu-title">Groups</span>
                </Link>
              </li>
            </>
            : null
        }
        <li className="nav-item nav-category"><span className="nav-link">Finance</span></li>
        <li className={ isPathActive('/expenses') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
          <div className={ expensesMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setExpensesMenuOpen(!expensesMenuOpen) } data-toggle="collapse">
            <span className="menu-icon"><i className="mdi mdi-cash"></i></span>
            <span className="menu-title">Expenses</span>
            <i className="menu-arrow"></i>
          </div>
          <Collapse in={ expensesMenuOpen }>
            <div>
              <ul className="nav flex-column sub-menu">
                <li className="nav-item">
                  <Link className={ isPathExact('/expenses') ? 'nav-link active' : 'nav-link' } to="/expenses">
                    My expenses
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={ isPathActive('/expenses/groups') ? 'nav-link active' : 'nav-link' } to="/expenses/groups">
                    <span>My groups</span>
                  </Link>
                </li>
              </ul>
            </div>
          </Collapse>
        </li>
        <li className={ location.pathname === "/exchange-rates" ? 'nav-item menu-items active' : 'nav-item menu-items' }>
          <Link className="nav-link" to="/exchange-rates">
            <span className="menu-icon"><i className="mdi mdi-chart-bar"></i></span>
            <span className="menu-title">Exchange Rates</span>
          </Link>
        </li>
        <li className="nav-item nav-category"><span className="nav-link">Other</span></li>
        <li className={ isPathActive('/earthquakes') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
          <Link className="nav-link" to="/earthquakes">
            <span className="menu-icon"><i className="mdi mdi-earth"></i></span>
            <span className="menu-title"><Trans>Earthquakes</Trans></span>
          </Link>
        </li>
        <li className={ isPathActive('/meals') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
          <Link className="nav-link" to="/meals">
            <span className="menu-icon"><i className="mdi mdi-food"></i></span>
            <span className="menu-title">Meals</span>
          </Link>
        </li>

        <li className={ isPathActive('/documentation') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
          <div className={ documentationMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setDocumentationMenuOpen(!documentationMenuOpen) } data-toggle="collapse">
            <span className="menu-icon"><i className="mdi mdi-lock"></i></span>
            <span className="menu-title">Docs</span>
            <i className="menu-arrow"></i>
          </div>
          <Collapse in={ documentationMenuOpen }>
            <div>
              <ul className="nav flex-column sub-menu">
                <li className="nav-item"> <Link className={ isPathActive('/documentation/terms-and-conditions') ? 'nav-link active' : 'nav-link' } to="/documentation/terms-and-conditions">Terms and Conditions</Link></li>
              </ul>
            </div>
          </Collapse>
        </li>
        {
          user?.is_staff
            ? <>
                <li className="nav-item nav-category"><span className="nav-link">Templates</span></li>
                <li className={ isPathActive('/basic-ui') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                  <div className={ basicUiMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setBasicUiMenuOpen(!basicUiMenuOpen) } data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-laptop"></i>
                    </span>
                    <span className="menu-title"><Trans>Basic UI Elements</Trans></span>
                    <i className="menu-arrow"></i>
                  </div>
                  <Collapse in={ basicUiMenuOpen }>
                    <div>
                      <ul className="nav flex-column sub-menu">
                        <li className="nav-item"> <Link className={ isPathActive('/basic-ui/buttons') ? 'nav-link active' : 'nav-link' } to="/basic-ui/buttons"><Trans>Buttons</Trans></Link></li>
                        <li className="nav-item"> <Link className={ isPathActive('/basic-ui/dropdowns') ? 'nav-link active' : 'nav-link' } to="/basic-ui/dropdowns"><Trans>Dropdowns</Trans></Link></li>
                        <li className="nav-item"> <Link className={ isPathActive('/basic-ui/typography') ? 'nav-link active' : 'nav-link' } to="/basic-ui/typography"><Trans>Typography</Trans></Link></li>
                      </ul>
                    </div>
                  </Collapse>
                </li>
                <li className={ isPathActive('/form-elements') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                  <div className={ formElementsMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setFormElementsMenuOpen(!formElementsMenuOpen) } data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-playlist-play"></i>
                    </span>
                    <span className="menu-title"><Trans>Form Elements</Trans></span>
                    <i className="menu-arrow"></i>
                  </div>
                  <Collapse in={ formElementsMenuOpen }>
                    <div>
                      <ul className="nav flex-column sub-menu">
                        <li className="nav-item"> <Link className={ isPathActive('/form-elements/basic-elements') ? 'nav-link active' : 'nav-link' } to="/form-elements/basic-elements"><Trans>Basic Elements</Trans></Link></li>
                      </ul>
                    </div>
                  </Collapse>
                </li>
                <li className={ isPathActive('/tables') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                  <div className={ tablesMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setTablesMenuOpen(!tablesMenuOpen) } data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-table-large"></i>
                    </span>
                    <span className="menu-title"><Trans>Tables</Trans></span>
                    <i className="menu-arrow"></i>
                  </div>
                  <Collapse in={ tablesMenuOpen }>
                    <div>
                      <ul className="nav flex-column sub-menu">
                        <li className="nav-item"> <Link className={ isPathActive('/tables/basic-table') ? 'nav-link active' : 'nav-link' } to="/tables/basic-table"><Trans>Basic Table</Trans></Link></li>
                      </ul>
                    </div>
                  </Collapse>
                </li>
                <li className={ isPathActive('/charts') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                  <div className={ chartsMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setChartsMenuOpen(!chartsMenuOpen) } data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-chart-bar"></i>
                    </span>
                    <span className="menu-title"><Trans>Charts</Trans></span>
                    <i className="menu-arrow"></i>
                  </div>
                  <Collapse in={ chartsMenuOpen }>
                    <div>
                      <ul className="nav flex-column sub-menu">
                        <li className="nav-item"> <Link className={ isPathActive('/charts/chart-js') ? 'nav-link active' : 'nav-link' } to="/charts/chart-js"><Trans>Chart Js</Trans></Link></li>
                      </ul>
                    </div>
                  </Collapse>
                </li>
                <li className={ isPathActive('/icons') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                  <div className={ iconsMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setIconsMenuOpen(!iconsMenuOpen) } data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-contacts"></i>
                    </span>
                    <span className="menu-title"><Trans>Icons</Trans></span>
                    <i className="menu-arrow"></i>
                  </div>
                  <Collapse in={ iconsMenuOpen }>
                    <div>
                      <ul className="nav flex-column sub-menu">
                        <li className="nav-item"> <Link className={ isPathActive('/icons/mdi') ? 'nav-link active' : 'nav-link' } to="/icons/mdi"><Trans>Material</Trans></Link></li>
                      </ul>
                    </div>
                  </Collapse>
                </li>
                <li className={ isPathActive('/login') || isPathActive('/register') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                  <div className={ userPagesMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setUserPagesMenuOpen(!userPagesMenuOpen) } data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-security"></i>
                    </span>
                    <span className="menu-title"><Trans>User Pages</Trans></span>
                    <i className="menu-arrow"></i>
                  </div>
                  <Collapse in={ userPagesMenuOpen }>
                    <div>
                      <ul className="nav flex-column sub-menu">
                        <li className="nav-item"> <Link className={ isPathActive('/login') ? 'nav-link active' : 'nav-link' } to="/login"><Trans>Login</Trans></Link></li>
                        <li className="nav-item"> <Link className={ isPathActive('/register') ? 'nav-link active' : 'nav-link' } to="/register"><Trans>Register</Trans></Link></li>
                      </ul>
                    </div>
                  </Collapse>
                </li>
                <li className={ isPathActive('/error-pages') ? 'nav-item menu-items active' : 'nav-item menu-items' }>
                  <div className={ errorPagesMenuOpen ? 'nav-link menu-expanded' : 'nav-link' } onClick={ () => setErrorPagesMenuOpen(!errorPagesMenuOpen) } data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-lock"></i>
                    </span>
                    <span className="menu-title"><Trans>Error Pages</Trans></span>
                    <i className="menu-arrow"></i>
                  </div>
                  <Collapse in={ errorPagesMenuOpen }>
                    <div>
                      <ul className="nav flex-column sub-menu">
                        <li className="nav-item"> <Link className={ isPathActive('/error-pages/error-404') ? 'nav-link active' : 'nav-link' } to="/error-pages/error-404">404</Link></li>
                        <li className="nav-item"> <Link className={ isPathActive('/error-pages/error-500') ? 'nav-link active' : 'nav-link' } to="/error-pages/error-500">500</Link></li>
                      </ul>
                    </div>
                  </Collapse>
                </li>
                <li className="nav-item menu-items">
                  <a className="nav-link" href="http://bootstrapdash.com/demo/corona-react-free/documentation/documentation.html" rel="noopener noreferrer" target="_blank">
                    <span className="menu-icon">
                      <i className="mdi mdi-file-document-box"></i>
                    </span>
                    <span className="menu-title"><Trans>Documentation</Trans></span>
                  </a>
                </li>
              </>
            : null
          }
      </ul>
      <Modal centered show={modalOpen} onHide={() => setModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                Are you sure you want to {currentModal}?
              </div>
            </div>
            <p className="text-muted mb-0">This may take a few moments, please be patient</p>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          This action is irreversible{currentModal === "reboot" && ", another URL will be generated"}!
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            setModalOpen(false)
          }}>Close</Button>
          <Button variant="danger" className="float-left" onClick={evt => {
            evt.preventDefault()
            if (currentModal === "reboot") dispatch(RpiApi.reboot(token))
            else if (currentModal === "clear build") dispatch(RpiApi.clearBuild(token))
            else if (currentModal === "restart backend") dispatch(RpiApi.restartBackend(token))
            setModalOpen(false)
          }}>
            {currentModal.toUpperCase()}
          </Button>
        </Modal.Footer>
      </Modal>
    </nav>
  );
}

export default withRouter(Sidebar);