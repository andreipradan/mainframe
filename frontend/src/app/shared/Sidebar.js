import React, { useEffect, useState } from 'react';
import {Link, useHistory, useLocation, withRouter} from 'react-router-dom';
import {Collapse, Dropdown, Row} from 'react-bootstrap';
import { Trans } from 'react-i18next';
import {useDispatch, useSelector} from "react-redux";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import {Circles} from "react-loader-spinner";

import Errors from './Errors';
import RpiApi from "../../api/rpi";
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

  const [accountsMenuOpen, setAccountsMenuOpen] = useState(false)
  const [appsMenuOpen, setAppsMenuOpen] = useState(false)
  const [authMenuOpen, setAuthMenuOpen] = useState(false)
  const [basicUiMenuOpen, setBasicUiMenuOpen] = useState(false)
  const [chartsMenuOpen, setChartsMenuOpen] = useState(false)
  const [commandsMenuOpen, setCommandsMenuOpen] = useState(false)
  const [creditMenuOpen, setCreditMenuOpen] = useState(false)
  const [documentationMenuOpen, setDocumentationMenuOpen] = useState(false)
  const [errorPagesMenuOpen, setErrorPagesMenuOpen] = useState(false)
  const [expensesMenuOpen, setExpensesMenuOpen] = useState(false)
  const [formElementsMenuOpen, setFormElementsMenuOpen] = useState(false)
  const [iconsMenuOpen, setIconsMenuOpen] = useState(false)
  const [investmentsMenuOpen, setInvestmentsMenuOpen] = useState(false)
  const [tablesMenuOpen, setTablesMenuOpen] = useState(false)
  const [travelMenuOpen, setTravelMenuOpen] = useState(false)
  const [userPagesMenuOpen, setUserPagesMenuOpen] = useState(false)

  useEffect(() => {setAlertOpen(Boolean(errors))}, [errors])
  useEffect(() => {setMessageOpen(Boolean(message))}, [message])

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
    setAccountsMenuOpen(false)
    setAppsMenuOpen(false)
    setAuthMenuOpen(false)
    setBasicUiMenuOpen(false)
    setChartsMenuOpen(false)
    setCommandsMenuOpen(false)
    setCreditMenuOpen(false)
    setErrorPagesMenuOpen(false)
    setExpensesMenuOpen(false)
    setFormElementsMenuOpen(false)
    setIconsMenuOpen(false)
    setInvestmentsMenuOpen(false)
    setTablesMenuOpen(false)
    setTravelMenuOpen(false)
    setUserPagesMenuOpen(false)
  }

  const onRouteChanged = () => {
    document.querySelector('#sidebar').classList.remove('active');
    closeAllMenus()

    const dropdownPaths = [
      {path:'/apps', setState: setAppsMenuOpen},
      {path:'/auth', setState: setAuthMenuOpen},
      {path:'/basic-ui', setState: setBasicUiMenuOpen},
      {path:'/credit', setState: setCreditMenuOpen},
      {path:'/commands', setState: setCommandsMenuOpen},
      {path:'/expenses/car', setState: setExpensesMenuOpen},
      {path:'/expenses/travel', setState: setTravelMenuOpen},
      {path:'/finances/accounts', setState: setAccountsMenuOpen},
      {path:'/form-elements', setState: setFormElementsMenuOpen},
      {path:'/investments', setState: setInvestmentsMenuOpen},
      {path:'/tables', setState: setTablesMenuOpen},
      {path:'/icons', setState: setIconsMenuOpen},
      {path:'/charts', setState: setChartsMenuOpen},
      {path:'/login', setState: setUserPagesMenuOpen},
      {path:'/register', setState: setUserPagesMenuOpen},
      {path:'/error-pages', setState: setErrorPagesMenuOpen},
      {path:'/terms-and-conditions', setState: setDocumentationMenuOpen},
    ];

    dropdownPaths.forEach((obj => isPathActive(obj.path) && obj.setState(true)));

  }

  const isPathActive = path => location.pathname.startsWith(path)
  const isPathExact = path => location.pathname === path

  const handleSetModalAction = e => {
    e.preventDefault()
    setModalOpen(true)
    setCurrentModal(e.target.textContent)
  }
  const handleSubmitModal = evt => {
    evt.preventDefault()
    if (currentModal === "reboot") dispatch(RpiApi.reboot(token))
    else if (currentModal === "Restart backend") dispatch(RpiApi.restartService(token, "backend"))
    else if (currentModal === "Restart bot") dispatch(RpiApi.restartService(token, "bot"))
    else if (currentModal === "Restart quiz bot") dispatch(RpiApi.restartService(token, "quiz"))
    else if (currentModal === "Restart huey") dispatch(RpiApi.restartService(token, "huey"))
    setModalOpen(false)
  }

  return (
    <nav className="sidebar sidebar-offcanvas" id="sidebar">

      {/*logo */}
      <div className="sidebar-brand-wrapper d-none d-lg-flex align-items-center justify-content-center fixed-top">
        <a className="sidebar-brand brand-logo" href={user?.is_staff ? "/" : "/expenses"}><img src={logo} alt="logo" /></a>
        <a className="sidebar-brand brand-logo-mini" href={user?.is_staff ? "/" : "/expenses"}><img src={logoMini} alt="logo" /></a>
      </div>

      <ul className="nav">

        {/* profile and rpi actions*/}
        {
          user?.is_staff
            ? <>
        <li className="nav-item profile">
          <div className="profile-desc">
            <div className="profile-pic">
              <div className="count-indicator">
                <img className="img-xs rounded-circle " src={require('../../assets/images/faces/face15.jpg')} alt="profile" />
                <span className="count bg-success" />
              </div>
              <div className="profile-name">
                <h5 className="mb-0 font-weight-normal">
                  <Row>
                    {user?.username}&nbsp;
                    {loading && <Circles
                      visible
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
                <i className="mdi mdi-dots-vertical" />
              </Dropdown.Toggle>
              <Dropdown.Menu className="sidebar-dropdown preview-list">
                <a href="!#" className="dropdown-item preview-item" onClick={evt => {
                  evt.preventDefault()
                  history.push("/profile")
                }}>
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-settings text-primary" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1 text-small">Account settings</p>
                  </div>
                </a>
                {
                  user?.is_staff && <>
                    <Dropdown.Divider />
                    <Dropdown.Item href="!#" onClick={handleSetModalAction} className="preview-item">
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-server text-success" />
                        </div>
                      </div>
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1">Restart backend</p>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item href="!#" onClick={handleSetModalAction} className="preview-item">
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-robot text-info" />
                        </div>
                      </div>
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1">Restart bot</p>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item href="!#" onClick={handleSetModalAction} className="preview-item">
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-head-question-outline text-info" />
                        </div>
                      </div>
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1">Restart quiz bot</p>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item href="!#" onClick={handleSetModalAction} className="preview-item">
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-timer text-warning" />
                        </div>
                      </div>
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1">Restart huey</p>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item href="!#" onClick={e => {
                      e.preventDefault()
                      setModalOpen(true)
                      setCurrentModal("reboot")
                    }} className="preview-item">
                      <div className="preview-thumbnail">
                        <div className="preview-icon bg-dark rounded-circle">
                          <i className="mdi mdi-restart text-danger" />
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
          {alertOpen && <Errors errors={errors} />}
          {messageOpen && <Alert variant="primary" dismissible onClose={() => setMessageOpen(false)}>{message}</Alert>}
        </li>
              <li className="nav-item nav-category"><span className="nav-link">Admin</span></li>
              <li className={location.pathname === '/' ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <Link className="nav-link" to="/">
                  <span className="menu-icon"><i className="mdi mdi-speedometer" /></span>
                  <span className="menu-title"><Trans>Dashboard</Trans></span>
                </Link>
              </li>
              <li className={isPathActive('/apps') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={appsMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setAppsMenuOpen(!appsMenuOpen)} data-toggle="collapse">
                  <span className="menu-icon">
                    <i className="mdi mdi-apps" />
                  </span>
                  <span className="menu-title"><Trans>Apps</Trans></span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={appsMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link className={isPathActive('/apps/logs') ? 'nav-link active' : 'nav-link'} to="/apps/logs">
                          <i className="mdi mdi-ballot" />&nbsp;Logs
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/apps/messages') ? 'nav-link active' : 'nav-link'} to="/apps/messages">
                          <i className="mdi mdi-message" />&nbsp;Messages
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/apps/todo') ? 'nav-link active' : 'nav-link'} to="/apps/todo">
                          <i className="mdi mdi-clipboard-list" />&nbsp;To do list
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={isPathActive('/auth') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={authMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setAuthMenuOpen(!authMenuOpen)} data-toggle="collapse">
                  <span className="menu-icon">
                    <i className="mdi mdi-account-multiple" />
                  </span>
                  <span className="menu-title">Auth</span>
                  <i className="menu-arrow" />
                </div>

                <Collapse in={authMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link className={isPathActive('/auth/groups') ? 'nav-link active' : 'nav-link'} to="/auth/groups">
                          Groups
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/auth/users') ? 'nav-link active' : 'nav-link'} to="/auth/users">
                          Users
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={isPathActive('/bots') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <Link className="nav-link" to="/bots">
                  <span className="menu-icon"><i className="mdi mdi-speedometer" /></span>
                  <span className="menu-title">Bots</span>
                </Link>
              </li>
              <li className={isPathActive('/commands') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div
                  className={commandsMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                  onClick={() => setCommandsMenuOpen(!commandsMenuOpen)}
                  data-toggle="collapse"
                >
                  <span className="menu-icon">
                    <i className="mdi mdi-bash" />
                  </span>
                  <span className="menu-title">Commands</span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={commandsMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link
                          className={isPathActive('/commands/crons') ? 'nav-link active' : 'nav-link'}
                          to="/commands/crons"
                        >
                          <i className="mdi mdi-timer" />&nbsp;Crons
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link
                          className={isPathActive('/commands/management') ? 'nav-link active' : 'nav-link'}
                          to="/commands/management"
                        >
                          <i className="mdi mdi-account" />&nbsp;Management
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link
                          className={isPathActive('/commands/tasks') ? 'nav-link active' : 'nav-link'}
                          to="/commands/tasks"
                        >
                          <i className="mdi mdi-view-list" />&nbsp;Tasks
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link
                          className={isPathActive('/commands/watchers') ? 'nav-link active' : 'nav-link'}
                          to="/commands/watchers"
                        >
                          <i className="mdi mdi-eye-plus" />&nbsp;Watchers
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>

              <li className={isPathActive('/devices') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <Link className="nav-link" to="/devices">
                  <span className="menu-icon"><i className="mdi mdi-devices" /></span>
                  <span className="menu-title">Devices</span>
                </Link>
              </li>
              <li className={isPathActive('/sources') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <Link className="nav-link" to="/sources">
                  <span className="menu-icon"><i className="mdi mdi-network" /></span>
                  <span className="menu-title">Sources</span>
                </Link>
              </li>
              <li className="nav-item nav-category"><span className="nav-link">Finance</span></li>
              <li className={isPathActive('/finances/accounts') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={appsMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setAccountsMenuOpen(!accountsMenuOpen)} data-toggle="collapse">
                  <span className="menu-icon">
                    <i className="mdi mdi-credit-card-outline" />
                  </span>
                  <span className="menu-title">Accounts</span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={accountsMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link
                          className={isPathActive('/finances/accounts/transactions') ? 'nav-link active' : 'nav-link'}
                          to="/finances/accounts/transactions"
                        >
                          Overview
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link
                          className={isPathActive('/finances/accounts/categorize') ? 'nav-link active' : 'nav-link'}
                          to="/finances/accounts/categorize"
                        >
                          Categorize
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>

              <li className={isPathActive('/credit') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={creditMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setCreditMenuOpen(!creditMenuOpen)} data-toggle="collapse">
                  <span className="menu-icon">
                    <i className="mdi mdi-cash-multiple" />
                  </span>
                  <span className="menu-title">Credit</span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={creditMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link className={isPathActive('/credit/details') ? 'nav-link active' : 'nav-link'}
                              to="/credit/details">
                          Details
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/credit/calculator') ? 'nav-link active' : 'nav-link'}
                              to="/credit/calculator">
                          Calculator
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/credit/payments') ? 'nav-link active' : 'nav-link'}
                              to="/credit/payments">
                          Payments
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/credit/timetables') ? 'nav-link active' : 'nav-link'}
                              to="/credit/timetables">
                          Timetables
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>

              <li className={isPathActive('/expenses') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={expensesMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setExpensesMenuOpen(!expensesMenuOpen)} data-toggle="collapse">
                  <span className="menu-icon">
                    <i className="mdi mdi-account-cash-outline" />
                  </span>
                  <span className="menu-title">Expenses</span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={expensesMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link className={isPathActive('/expenses/car') ? 'nav-link active' : 'nav-link'}
                              to="/expenses/car">
                          Car
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>

              <li className={location.pathname === '/fx-rates' ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <Link className="nav-link" to="/fx-rates">
                  <span className="menu-icon"><i className="mdi mdi-chart-bar" /></span>
                  <span className="menu-title">FX Rates</span>
                </Link>
              </li>

              <li className={isPathActive('/investments') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={investmentsMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setInvestmentsMenuOpen(!investmentsMenuOpen)} data-toggle="collapse">
                  <span className="menu-icon">
                    <i className="mdi mdi-cash-multiple" />
                  </span>
                  <span className="menu-title">Investments</span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={investmentsMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item">
                        <Link className={isPathActive('/investments/summary') ? 'nav-link active' : 'nav-link'}
                              to="/investments/summary">
                          Summary
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/investments/bonds') ? 'nav-link active' : 'nav-link'}
                              to="/investments/bonds">
                          Bonds
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/investments/crypto') ? 'nav-link active' : 'nav-link'}
                              to="/investments/crypto">
                          Crypto
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/investments/deposits') ? 'nav-link active' : 'nav-link'}
                              to="/investments/deposits">
                          Deposits
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/investments/pension') ? 'nav-link active' : 'nav-link'}
                              to="/investments/pension">
                          Pension
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={isPathActive('/investments/stocks') ? 'nav-link active' : 'nav-link'}
                              to="/investments/stocks">
                          Stocks
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Collapse>
              </li>

            </>
            : null
        }
        {
          token && <>
            <li className="nav-item nav-category"><span className="nav-link">Expenses & Rates</span></li>

            <li className={isPathActive('/expenses/travel') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
              <div className={travelMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                   onClick={() => setTravelMenuOpen(!travelMenuOpen)} data-toggle="collapse">
                <span className="menu-icon"><i className="mdi mdi-earth" /></span>
                <span className="menu-title">Travel</span>
                <i className="menu-arrow" />
              </div>
              <Collapse in={travelMenuOpen}>
                <div>
                  <ul className="nav flex-column sub-menu">
                    <li className="nav-item">
                      <Link
                        className={isPathExact('/expenses/travel/my') ? 'nav-link active' : 'nav-link'}
                        to="/expenses/travel/my"
                      >
                        My expenses
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={isPathActive('/expenses/travel/groups') ? 'nav-link active' : 'nav-link'}
                            to="/expenses/travel/groups">
                        <span>My groups</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </Collapse>
            </li>
            <li className="nav-item nav-category"><span className="nav-link">Public</span></li>
            <li className={isPathActive('/earthquakes') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
              <Link className="nav-link" to="/earthquakes">
                <span className="menu-icon"><i className="mdi mdi-earth" /></span>
                <span className="menu-title">Earthquakes</span>
              </Link>
            </li>
            <li className={isPathActive('/meals') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
              <Link className="nav-link" to="/meals">
                <span className="menu-icon"><i className="mdi mdi-food" /></span>
                <span className="menu-title">Meals</span>
              </Link>
            </li>
          </>
        }

        <li className={isPathActive('/terms-and-conditions') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
          <div className={documentationMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
               onClick={() => setDocumentationMenuOpen(!documentationMenuOpen)} data-toggle="collapse">
            <span className="menu-icon"><i className="mdi mdi-lock" /></span>
            <span className="menu-title">Docs</span>
            <i className="menu-arrow" />
          </div>
          <Collapse in={documentationMenuOpen}>
            <div>
              <ul className="nav flex-column sub-menu">
                <li className="nav-item"><Link
                  className={isPathActive('/terms-and-conditions') ? 'nav-link active' : 'nav-link'}
                  to="/terms-and-conditions">Terms and Conditions</Link></li>
              </ul>
            </div>
          </Collapse>
        </li>
        {
          user?.is_staff
            ? <>
              <li className="nav-item nav-category"><span className="nav-link">Templates</span></li>
              <li className={isPathActive('/basic-ui') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={basicUiMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setBasicUiMenuOpen(!basicUiMenuOpen)} data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-laptop" />
                    </span>
                  <span className="menu-title"><Trans>Basic UI Elements</Trans></span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={basicUiMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item"><Link
                        className={isPathActive('/basic-ui/buttons') ? 'nav-link active' : 'nav-link'}
                        to="/basic-ui/buttons"><Trans>Buttons</Trans></Link></li>
                      <li className="nav-item"><Link
                        className={isPathActive('/basic-ui/dropdowns') ? 'nav-link active' : 'nav-link'}
                        to="/basic-ui/dropdowns"><Trans>Dropdowns</Trans></Link></li>
                      <li className="nav-item"><Link
                        className={isPathActive('/basic-ui/typography') ? 'nav-link active' : 'nav-link'}
                        to="/basic-ui/typography"><Trans>Typography</Trans></Link></li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={isPathActive('/form-elements') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={formElementsMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setFormElementsMenuOpen(!formElementsMenuOpen)} data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-playlist-play" />
                    </span>
                  <span className="menu-title"><Trans>Form Elements</Trans></span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={formElementsMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item"><Link
                        className={isPathActive('/form-elements/basic-elements') ? 'nav-link active' : 'nav-link'}
                        to="/form-elements/basic-elements"><Trans>Basic Elements</Trans></Link></li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={isPathActive('/tables') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={tablesMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setTablesMenuOpen(!tablesMenuOpen)} data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-table-large" />
                    </span>
                  <span className="menu-title"><Trans>Tables</Trans></span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={tablesMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item"><Link
                        className={isPathActive('/tables/basic-table') ? 'nav-link active' : 'nav-link'}
                        to="/tables/basic-table"><Trans>Basic Table</Trans></Link></li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={isPathActive('/charts') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={chartsMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setChartsMenuOpen(!chartsMenuOpen)} data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-chart-bar" />
                    </span>
                  <span className="menu-title"><Trans>Charts</Trans></span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={chartsMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item"><Link
                        className={isPathActive('/charts/chart-js') ? 'nav-link active' : 'nav-link'}
                        to="/charts/chart-js"><Trans>Chart Js</Trans></Link></li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={isPathActive('/icons') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={iconsMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setIconsMenuOpen(!iconsMenuOpen)} data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-contacts" />
                    </span>
                  <span className="menu-title"><Trans>Icons</Trans></span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={iconsMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item"><Link
                        className={isPathActive('/icons/mdi') ? 'nav-link active' : 'nav-link'}
                        to="/icons/mdi"><Trans>Material</Trans></Link></li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li
                className={isPathActive('/login') || isPathActive('/register') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={userPagesMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setUserPagesMenuOpen(!userPagesMenuOpen)} data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-security" />
                    </span>
                  <span className="menu-title"><Trans>User Pages</Trans></span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={userPagesMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item"><Link className={isPathActive('/login') ? 'nav-link active' : 'nav-link'}
                                                     to="/login"><Trans>Login</Trans></Link></li>
                      <li className="nav-item"><Link
                        className={isPathActive('/register') ? 'nav-link active' : 'nav-link'}
                        to="/register"><Trans>Register</Trans></Link></li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className={isPathActive('/error-pages') ? 'nav-item menu-items active' : 'nav-item menu-items'}>
                <div className={errorPagesMenuOpen ? 'nav-link menu-expanded' : 'nav-link'}
                     onClick={() => setErrorPagesMenuOpen(!errorPagesMenuOpen)} data-toggle="collapse">
                    <span className="menu-icon">
                      <i className="mdi mdi-lock" />
                    </span>
                  <span className="menu-title"><Trans>Error Pages</Trans></span>
                  <i className="menu-arrow" />
                </div>
                <Collapse in={errorPagesMenuOpen}>
                  <div>
                    <ul className="nav flex-column sub-menu">
                      <li className="nav-item"><Link
                        className={isPathActive('/error-pages/error-404') ? 'nav-link active' : 'nav-link'}
                        to="/error-pages/error-404">404</Link></li>
                      <li className="nav-item"><Link
                        className={isPathActive('/error-pages/error-500') ? 'nav-link active' : 'nav-link'}
                        to="/error-pages/error-500">500</Link></li>
                    </ul>
                  </div>
                </Collapse>
              </li>
              <li className="nav-item menu-items">
                <a className="nav-link"
                   href="http://bootstrapdash.com/demo/corona-react-free/documentation/documentation.html"
                   rel="noopener noreferrer" target="_blank">
                    <span className="menu-icon">
                      <i className="mdi mdi-file-document-box" />
                    </span>
                  <span className="menu-title"><Trans>Documentation</Trans></span>
                </a>
              </li>
            </>
            : null
        }
      </ul>

      {/* action modal */}
      <Modal centered show={modalOpen} onHide={() => setModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                Are you sure you want to {currentModal?.toLowerCase()}?
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
          <Button variant="danger" className="float-left" onClick={handleSubmitModal}>
            {currentModal.toUpperCase()}
          </Button>
        </Modal.Footer>
      </Modal>
    </nav>
  );
}

export default withRouter(Sidebar);