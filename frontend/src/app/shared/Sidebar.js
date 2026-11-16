import React, { useEffect, useState } from 'react';
import { Link, useLocation, withRouter } from 'react-router-dom';
import { Collapse, Dropdown, Row } from 'react-bootstrap';
import { Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';

import Errors from './Errors';
import RpiApi from '../../api/rpi';
import logo from '../../assets/images/logo.svg';
import logoMini from '../../assets/images/logo-mini.svg';

import { toastParams } from '../../api/auth';

/** Returns the standard sidebar item classes for the active route. */
const menuItemClass = (isActive) =>
  `nav-item menu-items${isActive ? ' active' : ''}`;
/** Returns the standard sidebar link classes for the active route. */
const navLinkClass = (isActive) => `nav-link${isActive ? ' active' : ''}`;
/** Returns the standard sidebar disclosure classes for its expanded state. */
const menuToggleClass = (isOpen) => `nav-link${isOpen ? ' menu-expanded' : ''}`;

/** Renders the shared nested-list wrapper used by collapsible menu groups. */
const SidebarSubMenu = ({ id, children }) => (
  <div id={id}>
    <ul className='nav flex-column sub-menu'>{children}</ul>
  </div>
);

/** Renders an accessible collapsible navigation item and its child links. */
const SidebarMenu = ({ active, open, onToggle, id, label, icon, children }) => (
  <li className={menuItemClass(active)}>
    <button
      type='button'
      className={menuToggleClass(open)}
      aria-expanded={open}
      aria-controls={id}
      aria-label={`${label} menu`}
      title={`${label} menu`}
      onClick={onToggle}
      data-toggle='collapse'
      style={{
        background: 'none',
        border: 0,
        cursor: 'pointer',
        font: 'inherit',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <span className='menu-icon'>
        <i className={`mdi ${icon}`} />
      </span>
      <span className='menu-title'>{label}</span>
      <i className='menu-arrow' />
    </button>
    <Collapse in={open}>
      <SidebarSubMenu id={id}>{children}</SidebarSubMenu>
    </Collapse>
  </li>
);

/** Renders the reusable icon and label content for a staff action. */
const StaffActionItem = ({ icon, title, onClick }) => (
  <Dropdown.Item href='!#' onClick={onClick} className='preview-item'>
    <div className='preview-thumbnail'>
      <div className='preview-icon bg-dark rounded-circle'>
        <i className={`mdi ${icon}`} />
      </div>
    </div>
    <div className='preview-item-content'>
      <p className='preview-subject mb-1'>{title}</p>
    </div>
  </Dropdown.Item>
);

/** Provides staff-only service actions from the profile menu. */
const StaffActionMenu = ({
  handleSetModalAction,
  setModalOpen,
  setCurrentModal,
}) => {
  const actions = [
    { icon: 'mdi-database-refresh text-success', title: 'Run migrations' },
    { icon: 'mdi-autorenew text-info', title: 'Reset tasks' },
    { icon: 'mdi-robot text-warning', title: 'Restart bot' },
    { icon: 'mdi-poll text-warning', title: 'Restart quiz bot' },
    { icon: 'mdi-server text-warning', title: 'Restart backend' },
    { icon: 'mdi-sync text-warning', title: 'Restart huey' },
  ];

  return (
    <Dropdown alignRight>
      <Dropdown.Toggle as='a' className='cursor-pointer no-caret'>
        <i className='mdi mdi-dots-vertical' />
      </Dropdown.Toggle>
      <Dropdown.Menu className='sidebar-dropdown preview-list'>
        {actions.map((action) => (
          <React.Fragment key={action.title}>
            <StaffActionItem {...action} onClick={handleSetModalAction} />
            <Dropdown.Divider />
          </React.Fragment>
        ))}
        <StaffActionItem
          icon='mdi-restart text-danger'
          title={<Trans>Reboot</Trans>}
          onClick={(event) => {
            event.preventDefault();
            setModalOpen(true);
            setCurrentModal('reboot');
          }}
        />
      </Dropdown.Menu>
    </Dropdown>
  );
};

/** Displays the signed-in user's avatar, name, and login timestamp. */
const StaffIdentity = ({ user, loading }) => (
  <div className='profile-pic'>
    <ProfileAvatar />
    <div className='profile-name'>
      <h5 className='mb-0 font-weight-normal'>
        <Row>
          {user?.username}&nbsp;
          {loading && (
            <Circles
              visible
              height='15'
              width='100%'
              ariaLabel='ball-triangle-loading'
              wrapperStyle={{}}
              wrapperClass={{}}
              color='orange'
            />
          )}
        </Row>
      </h5>
      <span>{new Date(user?.last_login).toLocaleString()}</span>
    </div>
  </div>
);

/** Displays the signed-in staff profile and its status messages. */
const StaffProfile = ({
  user,
  token,
  loading,
  errors,
  alertOpen,
  message,
  messageOpen,
  setMessageOpen,
  handleSetModalAction,
  setModalOpen,
  setCurrentModal,
  isPathExact,
}) => (
  <>
    <li className='nav-item profile'>
      <div className='profile-desc'>
        <StaffIdentity user={user} loading={loading} />
        {token && (
          <StaffActionMenu
            handleSetModalAction={handleSetModalAction}
            setModalOpen={setModalOpen}
            setCurrentModal={setCurrentModal}
          />
        )}
      </div>
      {alertOpen && <Errors errors={errors} />}
      {messageOpen && (
        <Alert
          variant='primary'
          dismissible
          onClose={() => setMessageOpen(false)}
        >
          {message}
        </Alert>
      )}
    </li>
    <li className='nav-item nav-category'>
      <span className='nav-link'>Admin</span>
    </li>
    <li className={menuItemClass(isPathExact('/'))}>
      <Link className='nav-link' to='/'>
        <span className='menu-icon'>
          <i className='mdi mdi-view-dashboard' />
        </span>
        <span className='menu-title'>
          <Trans>Dashboard</Trans>
        </span>
      </Link>
    </li>
  </>
);

/** Renders the staff-only template navigation groups. */
const StaffTemplateNavigation = ({ navigation }) => {
  const {
    basicUiMenuOpen,
    setBasicUiMenuOpen,
    formElementsMenuOpen,
    setFormElementsMenuOpen,
    tablesMenuOpen,
    setTablesMenuOpen,
    chartsMenuOpen,
    setChartsMenuOpen,
    iconsMenuOpen,
    setIconsMenuOpen,
    userPagesMenuOpen,
    setUserPagesMenuOpen,
    errorPagesMenuOpen,
    setErrorPagesMenuOpen,
    isPathActive,
  } = navigation;
  const menuGroups = [
    {
      id: 'sidebar-basic-ui-menu',
      path: '/basic-ui',
      label: <Trans>Basic UI Elements</Trans>,
      icon: 'mdi-laptop',
      open: basicUiMenuOpen,
      onToggle: () => setBasicUiMenuOpen(!basicUiMenuOpen),
      links: [
        ['/basic-ui/buttons', <Trans>Buttons</Trans>],
        ['/basic-ui/dropdowns', <Trans>Dropdowns</Trans>],
        ['/basic-ui/typography', <Trans>Typography</Trans>],
      ],
    },
    {
      id: 'sidebar-form-elements-menu',
      path: '/form-elements',
      label: <Trans>Form Elements</Trans>,
      icon: 'mdi-playlist-play',
      open: formElementsMenuOpen,
      onToggle: () => setFormElementsMenuOpen(!formElementsMenuOpen),
      links: [['/form-elements/basic-elements', <Trans>Basic Elements</Trans>]],
    },
    {
      id: 'sidebar-tables-menu',
      path: '/tables',
      label: <Trans>Tables</Trans>,
      icon: 'mdi-table-large',
      open: tablesMenuOpen,
      onToggle: () => setTablesMenuOpen(!tablesMenuOpen),
      links: [['/tables/basic-table', <Trans>Basic Table</Trans>]],
    },
    {
      id: 'sidebar-charts-menu',
      path: '/charts',
      label: <Trans>Charts</Trans>,
      icon: 'mdi-chart-bar',
      open: chartsMenuOpen,
      onToggle: () => setChartsMenuOpen(!chartsMenuOpen),
      links: [['/charts/chart-js', <Trans>Chart Js</Trans>]],
    },
    {
      id: 'sidebar-icons-menu',
      path: '/icons',
      label: <Trans>Icons</Trans>,
      icon: 'mdi-contacts',
      open: iconsMenuOpen,
      onToggle: () => setIconsMenuOpen(!iconsMenuOpen),
      links: [['/icons/mdi', <Trans>Material</Trans>]],
    },
    {
      id: 'sidebar-user-pages-menu',
      path: '/login',
      active: isPathActive('/login') || isPathActive('/register'),
      label: <Trans>User Pages</Trans>,
      icon: 'mdi-security',
      open: userPagesMenuOpen,
      onToggle: () => setUserPagesMenuOpen(!userPagesMenuOpen),
      links: [
        ['/login', <Trans>Login</Trans>],
        ['/register', <Trans>Register</Trans>],
      ],
    },
    {
      id: 'sidebar-error-pages-menu',
      path: '/error-pages',
      label: <Trans>Error Pages</Trans>,
      icon: 'mdi-lock',
      open: errorPagesMenuOpen,
      onToggle: () => setErrorPagesMenuOpen(!errorPagesMenuOpen),
      links: [
        ['/error-pages/error-404', '404'],
        ['/error-pages/error-500', '500'],
      ],
    },
  ];

  return (
    <>
      <li className='nav-item nav-category'>
        <span className='nav-link'>Templates</span>
      </li>
      {menuGroups.map((group) => (
        <SidebarMenu
          key={group.id}
          {...group}
          active={group.active ?? isPathActive(group.path)}
        >
          {group.links.map(([path, label]) => (
            <li className='nav-item' key={path}>
              <Link className={navLinkClass(isPathActive(path))} to={path}>
                {label}
              </Link>
            </li>
          ))}
        </SidebarMenu>
      ))}
    </>
  );
};

/** Shows the action text used by the shared staff confirmation dialog. */
const SidebarActionTitle = ({ currentModal }) => (
  <Modal.Title>
    <div className='row'>
      <div className='col-lg-12 grid-margin stretch-card'>
        Are you sure you want to {currentModal?.toLowerCase()}?
      </div>
    </div>
    <p className='text-muted mb-0'>
      This may take a few moments, please be patient
    </p>
  </Modal.Title>
);

/** Confirms and submits a staff action selected from the profile menu. */
const SidebarActionModal = ({
  modalOpen,
  currentModal,
  setModalOpen,
  handleSubmitModal,
}) => (
  <Modal centered show={modalOpen} onHide={() => setModalOpen(false)}>
    <Modal.Header closeButton>
      <SidebarActionTitle currentModal={currentModal} />
    </Modal.Header>
    <Modal.Body>
      This action is irreversible
      {currentModal === 'reboot' && ', another URL will be generated'}!
    </Modal.Body>
    <Modal.Footer>
      <Button
        variant='secondary'
        onClick={(event) => {
          event.preventDefault();
          setModalOpen(false);
        }}
      >
        Close
      </Button>
      <Button
        variant='danger'
        className='float-left'
        onClick={handleSubmitModal}
      >
        {currentModal.toUpperCase()}
      </Button>
    </Modal.Footer>
  </Modal>
);

/** Renders the staff avatar independently from nested profile details. */
const ProfileAvatar = () => (
  <div className='count-indicator'>
    <img
      className='img-xs rounded-circle '
      src={require('../../assets/images/faces/face15.jpg')}
      alt='profile'
    />
    <span className='count bg-success' />
  </div>
);

/** Renders authenticated users' travel menu and its route links. */
const TravelNavigation = ({ navigation }) => {
  const { isPathActive, isPathExact, travelMenuOpen, setTravelMenuOpen } =
    navigation;

  return (
    <>
      <li className='nav-item nav-category'>
        <span className='nav-link'>Expenses & Rates</span>
      </li>
      <SidebarMenu
        path='/expenses/travel'
        active={isPathActive('/expenses/travel')}
        open={travelMenuOpen}
        onToggle={() => setTravelMenuOpen(!travelMenuOpen)}
        id='sidebar-travel-menu'
        label='Travel'
        icon='mdi-earth'
      >
        <li className='nav-item'>
          <Link
            className={navLinkClass(isPathExact('/expenses/travel/my'))}
            to='/expenses/travel/my'
          >
            My expenses
          </Link>
        </li>
        <li className='nav-item'>
          <Link
            className={navLinkClass(isPathActive('/expenses/travel/groups'))}
            to='/expenses/travel/groups'
          >
            <span>My groups</span>
          </Link>
        </li>
      </SidebarMenu>
    </>
  );
};

/** Renders the user's route-aware sidebar navigation. */
const SidebarNavigation = ({ navigation }) => {
  const {
    alertOpen,
    errors,
    loading,
    message,
    messageOpen,
    setMessageOpen,
    setModalOpen,
    setCurrentModal,
    token,
    user,
    isPathActive,
    isPathExact,
    handleSetModalAction,
    accountsMenuOpen,
    setAccountsMenuOpen,
    appsMenuOpen,
    setAppsMenuOpen,
    authMenuOpen,
    setAuthMenuOpen,
    commandsMenuOpen,
    setCommandsMenuOpen,
    creditMenuOpen,
    setCreditMenuOpen,
    documentationMenuOpen,
    setDocumentationMenuOpen,
    expensesMenuOpen,
    setExpensesMenuOpen,
    investmentsMenuOpen,
    setInvestmentsMenuOpen,
  } = navigation;

  return (
    <ul className='nav'>
      {user?.is_staff && (
        <StaffProfile
          user={user}
          token={token}
          loading={loading}
          errors={errors}
          alertOpen={alertOpen}
          message={message}
          messageOpen={messageOpen}
          setMessageOpen={setMessageOpen}
          handleSetModalAction={handleSetModalAction}
          setModalOpen={setModalOpen}
          setCurrentModal={setCurrentModal}
          isPathExact={isPathExact}
        />
      )}
      {user?.is_staff && (
        <>
          <li className={menuItemClass(isPathActive('/apps'))}>
            <button
              type='button'
              className={menuToggleClass(appsMenuOpen)}
              aria-expanded={appsMenuOpen}
              aria-controls='sidebar-apps-menu'
              aria-label='Apps menu'
              title='Apps menu'
              onClick={() => setAppsMenuOpen(!appsMenuOpen)}
              data-toggle='collapse'
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span className='menu-icon'>
                <i className='mdi mdi-apps' />
              </span>
              <span className='menu-title'>
                <Trans>Apps</Trans>
              </span>
              <i className='menu-arrow' />
            </button>
            <Collapse in={appsMenuOpen}>
              <div id='sidebar-apps-menu'>
                <ul className='nav flex-column sub-menu'>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/apps/logs'))}
                      to='/apps/logs'
                    >
                      <i className='mdi mdi-file-document-outline' /> Logs
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/apps/messages'))}
                      to='/apps/messages'
                    >
                      <i className='mdi mdi-message-text' /> Messages
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/apps/todo'))}
                      to='/apps/todo'
                    >
                      <i className='mdi mdi-clipboard-list' /> To do list
                    </Link>
                  </li>
                </ul>
              </div>
            </Collapse>
          </li>
          <li className={menuItemClass(isPathActive('/auth'))}>
            <button
              type='button'
              className={menuToggleClass(authMenuOpen)}
              aria-expanded={authMenuOpen}
              aria-controls='sidebar-auth-menu'
              aria-label='Auth menu'
              title='Auth menu'
              onClick={() => setAuthMenuOpen(!authMenuOpen)}
              data-toggle='collapse'
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span className='menu-icon'>
                <i className='mdi mdi-account-multiple' />
              </span>
              <span className='menu-title'>Auth</span>
              <i className='menu-arrow' />
            </button>

            <Collapse in={authMenuOpen}>
              <div id='sidebar-auth-menu'>
                <ul className='nav flex-column sub-menu'>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/auth/groups'))}
                      to='/auth/groups'
                    >
                      Groups
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/auth/users'))}
                      to='/auth/users'
                    >
                      Users
                    </Link>
                  </li>
                </ul>
              </div>
            </Collapse>
          </li>
          <li className={menuItemClass(isPathActive('/bots'))}>
            <Link className='nav-link' to='/bots'>
              <span className='menu-icon'>
                <i className='mdi mdi-robot' />
              </span>
              <span className='menu-title'>Bots</span>
            </Link>
          </li>
          <li className={menuItemClass(isPathActive('/commands'))}>
            <button
              type='button'
              className={menuToggleClass(commandsMenuOpen)}
              aria-expanded={commandsMenuOpen}
              aria-controls='sidebar-commands-menu'
              aria-label='Commands menu'
              title='Commands menu'
              onClick={() => setCommandsMenuOpen(!commandsMenuOpen)}
              data-toggle='collapse'
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span className='menu-icon'>
                <i className='mdi mdi-console' />
              </span>
              <span className='menu-title'>Commands</span>
              <i className='menu-arrow' />
            </button>
            <Collapse in={commandsMenuOpen}>
              <div id='sidebar-commands-menu'>
                <ul className='nav flex-column sub-menu'>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/commands/crons'))}
                      to='/commands/crons'
                    >
                      <i className='mdi mdi-timer-sand' /> Crons
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/commands/management')
                      )}
                      to='/commands/management'
                    >
                      <i className='mdi mdi-account' /> Management
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/commands/tasks'))}
                      to='/commands/tasks'
                    >
                      <i className='mdi mdi-view-list' /> Tasks
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/commands/watchers')
                      )}
                      to='/commands/watchers'
                    >
                      <i className='mdi mdi-eye-settings-outline' /> Watchers
                    </Link>
                  </li>
                </ul>
              </div>
            </Collapse>
          </li>

          <li className={menuItemClass(isPathActive('/devices'))}>
            <Link className='nav-link' to='/devices'>
              <span className='menu-icon'>
                <i className='mdi mdi-devices' />
              </span>
              <span className='menu-title'>Devices</span>
            </Link>
          </li>
          <li className={menuItemClass(isPathActive('/events'))}>
            <Link className='nav-link' to='/events'>
              <span className='menu-icon'>
                <i className='mdi mdi-calendar-multiselect' />
              </span>
              <span className='menu-title'>Events</span>
            </Link>
          </li>
          <li className={menuItemClass(isPathActive('/sources'))}>
            <Link className='nav-link' to='/sources'>
              <span className='menu-icon'>
                <i className='mdi mdi-network' />
              </span>
              <span className='menu-title'>Sources</span>
            </Link>
          </li>
          <li className='nav-item nav-category'>
            <span className='nav-link'>Finance</span>
          </li>
          <li className={menuItemClass(isPathActive('/finances/accounts'))}>
            <button
              type='button'
              className={menuToggleClass(accountsMenuOpen)}
              aria-expanded={accountsMenuOpen}
              aria-controls='sidebar-accounts-menu'
              aria-label='Accounts menu'
              title='Accounts menu'
              onClick={() => setAccountsMenuOpen(!accountsMenuOpen)}
              data-toggle='collapse'
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span className='menu-icon'>
                <i className='mdi mdi-credit-card-outline' />
              </span>
              <span className='menu-title'>Accounts</span>
              <i className='menu-arrow' />
            </button>
            <Collapse in={accountsMenuOpen}>
              <div id='sidebar-accounts-menu'>
                <ul className='nav flex-column sub-menu'>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/finances/accounts/transactions')
                      )}
                      to='/finances/accounts/transactions'
                    >
                      Overview
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/finances/accounts/categorize')
                      )}
                      to='/finances/accounts/categorize'
                    >
                      Categorize
                    </Link>
                  </li>
                </ul>
              </div>
            </Collapse>
          </li>

          <li className={menuItemClass(isPathActive('/credit'))}>
            <button
              type='button'
              className={menuToggleClass(creditMenuOpen)}
              aria-expanded={creditMenuOpen}
              aria-controls='sidebar-credit-menu'
              aria-label='Credit menu'
              title='Credit menu'
              onClick={() => setCreditMenuOpen(!creditMenuOpen)}
              data-toggle='collapse'
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span className='menu-icon'>
                <i className='mdi mdi-cash-multiple' />
              </span>
              <span className='menu-title'>Credit</span>
              <i className='menu-arrow' />
            </button>
            <Collapse in={creditMenuOpen}>
              <div id='sidebar-credit-menu'>
                <ul className='nav flex-column sub-menu'>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/credit/details'))}
                      to='/credit/details'
                    >
                      Details
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/credit/calculator')
                      )}
                      to='/credit/calculator'
                    >
                      Calculator
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/credit/payments'))}
                      to='/credit/payments'
                    >
                      Payments
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/credit/timetables')
                      )}
                      to='/credit/timetables'
                    >
                      Timetables
                    </Link>
                  </li>
                </ul>
              </div>
            </Collapse>
          </li>

          <li className={menuItemClass(isPathActive('/expenses'))}>
            <button
              type='button'
              className={menuToggleClass(expensesMenuOpen)}
              aria-expanded={expensesMenuOpen}
              aria-controls='sidebar-expenses-menu'
              aria-label='Expenses menu'
              title='Expenses menu'
              onClick={() => setExpensesMenuOpen(!expensesMenuOpen)}
              data-toggle='collapse'
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span className='menu-icon'>
                <i className='mdi mdi-account-cash-outline' />
              </span>
              <span className='menu-title'>Expenses</span>
              <i className='menu-arrow' />
            </button>
            <Collapse in={expensesMenuOpen}>
              <div id='sidebar-expenses-menu'>
                <ul className='nav flex-column sub-menu'>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(isPathActive('/expenses/car'))}
                      to='/expenses/car'
                    >
                      Car
                    </Link>
                  </li>
                </ul>
              </div>
            </Collapse>
          </li>

          <li className={menuItemClass(location.pathname === '/fx-rates')}>
            <Link className='nav-link' to='/fx-rates'>
              <span className='menu-icon'>
                <i className='mdi mdi-chart-line' />
              </span>
              <span className='menu-title'>FX Rates</span>
            </Link>
          </li>

          <li className={menuItemClass(isPathActive('/investments'))}>
            <button
              type='button'
              className={menuToggleClass(investmentsMenuOpen)}
              aria-expanded={investmentsMenuOpen}
              aria-controls='sidebar-investments-menu'
              aria-label='Investments menu'
              title='Investments menu'
              onClick={() => setInvestmentsMenuOpen(!investmentsMenuOpen)}
              data-toggle='collapse'
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span className='menu-icon'>
                <i className='mdi mdi-cash-multiple' />
              </span>
              <span className='menu-title'>Investments</span>
              <i className='menu-arrow' />
            </button>
            <Collapse in={investmentsMenuOpen}>
              <div id='sidebar-investments-menu'>
                <ul className='nav flex-column sub-menu'>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/investments/summary')
                      )}
                      to='/investments/summary'
                    >
                      Summary
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/investments/bonds')
                      )}
                      to='/investments/bonds'
                    >
                      Bonds
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/investments/crypto')
                      )}
                      to='/investments/crypto'
                    >
                      Crypto
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/investments/deposits')
                      )}
                      to='/investments/deposits'
                    >
                      Deposits
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/investments/pension')
                      )}
                      to='/investments/pension'
                    >
                      Pension
                    </Link>
                  </li>
                  <li className='nav-item'>
                    <Link
                      className={navLinkClass(
                        isPathActive('/investments/stocks')
                      )}
                      to='/investments/stocks'
                    >
                      Stocks
                    </Link>
                  </li>
                </ul>
              </div>
            </Collapse>
          </li>
        </>
      )}
      {user && (
        <>
          <TravelNavigation navigation={navigation} />
          <li className='nav-item nav-category'>
            <span className='nav-link'>Public</span>
          </li>
          <li className={menuItemClass(isPathActive('/earthquakes'))}>
            <Link className='nav-link' to='/earthquakes'>
              <span className='menu-icon'>
                <i className='mdi mdi-earth' />
              </span>
              <span className='menu-title'>Earthquakes</span>
            </Link>
          </li>
          <li className={menuItemClass(isPathActive('/meals'))}>
            <Link className='nav-link' to='/meals'>
              <span className='menu-icon'>
                <i className='mdi mdi-food' />
              </span>
              <span className='menu-title'>Meals</span>
            </Link>
          </li>
          <li className={menuItemClass(isPathActive('/transport'))}>
            <Link className='nav-link' to='/transport'>
              <span className='menu-icon'>
                <i className='mdi mdi-bus' />
              </span>
              <span className='menu-title'>Transport</span>
            </Link>
          </li>
        </>
      )}

      <li className={menuItemClass(isPathActive('/terms-and-conditions'))}>
        <button
          type='button'
          className={menuToggleClass(documentationMenuOpen)}
          aria-expanded={documentationMenuOpen}
          aria-controls='sidebar-documentation-menu'
          aria-label='Documentation menu'
          title='Documentation menu'
          onClick={() => setDocumentationMenuOpen(!documentationMenuOpen)}
          data-toggle='collapse'
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            font: 'inherit',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <span className='menu-icon'>
            <i className='mdi mdi-file-document' />
          </span>
          <span className='menu-title'>Docs</span>
          <i className='menu-arrow' />
        </button>
        <Collapse in={documentationMenuOpen}>
          <div id='sidebar-documentation-menu'>
            <ul className='nav flex-column sub-menu'>
              <li className='nav-item'>
                <Link
                  className={navLinkClass(
                    isPathActive('/terms-and-conditions')
                  )}
                  to='/terms-and-conditions'
                >
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>
        </Collapse>
      </li>
      {user?.is_staff && (
        <>
          <StaffTemplateNavigation navigation={navigation} />
          <li className='nav-item menu-items'>
            <a
              className='nav-link'
              href='https://bootstrapdash.com/demo/corona-react-free/documentation/documentation.html'
              rel='noopener noreferrer'
              target='_blank'
            >
              <span className='menu-icon'>
                <i className='mdi mdi-file-document-box' />
              </span>
              <span className='menu-title'>
                <Trans>Documentation</Trans>
              </span>
            </a>
          </li>
        </>
      )}
    </ul>
  );
};

const Sidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  const token = useSelector((state) => state.rpi.token);
  const user = useSelector((state) => state.auth.user);
  const { errors, loading, message } = useSelector((state) => state.rpi);

  const [alertOpen, setAlertOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentModal, setCurrentModal] = useState('');

  const [accountsMenuOpen, setAccountsMenuOpen] = useState(false);
  const [appsMenuOpen, setAppsMenuOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [basicUiMenuOpen, setBasicUiMenuOpen] = useState(false);
  const [chartsMenuOpen, setChartsMenuOpen] = useState(false);
  const [commandsMenuOpen, setCommandsMenuOpen] = useState(false);
  const [creditMenuOpen, setCreditMenuOpen] = useState(false);
  const [documentationMenuOpen, setDocumentationMenuOpen] = useState(false);
  const [errorPagesMenuOpen, setErrorPagesMenuOpen] = useState(false);
  const [expensesMenuOpen, setExpensesMenuOpen] = useState(false);
  const [formElementsMenuOpen, setFormElementsMenuOpen] = useState(false);
  const [iconsMenuOpen, setIconsMenuOpen] = useState(false);
  const [investmentsMenuOpen, setInvestmentsMenuOpen] = useState(false);
  const [tablesMenuOpen, setTablesMenuOpen] = useState(false);
  const [travelMenuOpen, setTravelMenuOpen] = useState(false);
  const [userPagesMenuOpen, setUserPagesMenuOpen] = useState(false);

  const closeAllMenus = () => {
    setAccountsMenuOpen(false);
    setAppsMenuOpen(false);
    setAuthMenuOpen(false);
    setBasicUiMenuOpen(false);
    setChartsMenuOpen(false);
    setCommandsMenuOpen(false);
    setCreditMenuOpen(false);
    setErrorPagesMenuOpen(false);
    setExpensesMenuOpen(false);
    setFormElementsMenuOpen(false);
    setIconsMenuOpen(false);
    setInvestmentsMenuOpen(false);
    setTablesMenuOpen(false);
    setTravelMenuOpen(false);
    setUserPagesMenuOpen(false);
  };

  /** Checks whether the current route starts with a navigation path. */
  const isPathActive = (path) => location.pathname.startsWith(path);
  const onRouteChanged = () => {
    document.querySelector('#sidebar').classList.remove('active');
    closeAllMenus();

    const dropdownPaths = [
      { path: '/apps', setState: setAppsMenuOpen },
      { path: '/auth', setState: setAuthMenuOpen },
      { path: '/basic-ui', setState: setBasicUiMenuOpen },
      { path: '/credit', setState: setCreditMenuOpen },
      { path: '/commands', setState: setCommandsMenuOpen },
      { path: '/expenses/car', setState: setExpensesMenuOpen },
      { path: '/expenses/travel', setState: setTravelMenuOpen },
      { path: '/finances/accounts', setState: setAccountsMenuOpen },
      { path: '/form-elements', setState: setFormElementsMenuOpen },
      { path: '/investments', setState: setInvestmentsMenuOpen },
      { path: '/tables', setState: setTablesMenuOpen },
      { path: '/icons', setState: setIconsMenuOpen },
      { path: '/charts', setState: setChartsMenuOpen },
      { path: '/login', setState: setUserPagesMenuOpen },
      { path: '/register', setState: setUserPagesMenuOpen },
      { path: '/error-pages', setState: setErrorPagesMenuOpen },
      { path: '/terms-and-conditions', setState: setDocumentationMenuOpen },
    ];

    dropdownPaths.forEach(
      (obj) => isPathActive(obj.path) && obj.setState(true)
    );
  };

  useEffect(() => {
    setAlertOpen(Boolean(errors));
  }, [errors]);
  useEffect(() => {
    setMessageOpen(Boolean(message));
  }, [message]);

  useEffect(() => {
    onRouteChanged();
    const body = document.querySelector('body');
    document.querySelectorAll('.sidebar .nav-item').forEach((el) => {
      el.addEventListener('mouseover', function () {
        if (body.classList.contains('sidebar-icon-only')) {
          el.classList.add('hover-open');
        }
      });
      el.addEventListener('mouseout', function () {
        if (body.classList.contains('sidebar-icon-only')) {
          const disclosure = el.querySelector('button[aria-expanded]');
          if (disclosure?.getAttribute('aria-expanded') !== 'true') {
            el.classList.remove('hover-open');
          }
        }
      });
      el.addEventListener('focusin', function () {
        if (body.classList.contains('sidebar-icon-only')) {
          el.classList.add('hover-open');
        }
      });
      el.addEventListener('focusout', function () {
        if (body.classList.contains('sidebar-icon-only')) {
          const disclosure = el.querySelector('button[aria-expanded]');
          if (disclosure?.getAttribute('aria-expanded') !== 'true') {
            el.classList.remove('hover-open');
          }
        }
      });
    });
  }, []);

  useEffect(() => {
    onRouteChanged();
  }, [location]);

  const isPathExact = (path) => location.pathname === path;

  const handleSetModalAction = (e) => {
    e.preventDefault();
    setModalOpen(true);
    setCurrentModal(e.target.textContent);
  };
  const handleSubmitModal = (evt) => {
    evt.preventDefault();
    if (currentModal === 'Run migrations') dispatch(RpiApi.migrate(token));
    else if (currentModal === 'reboot') dispatch(RpiApi.reboot(token));
    else if (currentModal === 'Restart backend')
      dispatch(RpiApi.restartService(token, 'backend'));
    else if (currentModal === 'Restart bot')
      dispatch(RpiApi.restartService(token, 'bot'));
    else if (currentModal === 'Restart quiz bot')
      dispatch(RpiApi.restartService(token, 'quiz'));
    else if (currentModal === 'Restart huey')
      dispatch(RpiApi.restartService(token, 'huey'));
    else if (currentModal === 'Reset tasks') dispatch(RpiApi.resetTasks(token));
    else toast.warning(`Unhandled action ${currentModal}!`, toastParams);
    setModalOpen(false);
  };

  return (
    <nav className='sidebar sidebar-offcanvas' id='sidebar'>
      {/*logo */}
      <div className='sidebar-brand-wrapper d-none d-lg-flex align-items-center justify-content-center fixed-top'>
        <a
          className='sidebar-brand brand-logo'
          href={user?.is_staff ? '/' : '/expenses'}
        >
          <img src={logo} alt='logo' />
        </a>
        <a
          className='sidebar-brand brand-logo-mini'
          href={user?.is_staff ? '/' : '/expenses'}
        >
          <img src={logoMini} alt='logo' />
        </a>
      </div>

      <SidebarNavigation
        navigation={{
          alertOpen,
          errors,
          loading,
          message,
          messageOpen,
          setMessageOpen,
          setModalOpen,
          setCurrentModal,
          token,
          user,
          isPathActive,
          isPathExact,
          handleSetModalAction,
          accountsMenuOpen,
          setAccountsMenuOpen,
          appsMenuOpen,
          setAppsMenuOpen,
          authMenuOpen,
          setAuthMenuOpen,
          basicUiMenuOpen,
          setBasicUiMenuOpen,
          chartsMenuOpen,
          setChartsMenuOpen,
          commandsMenuOpen,
          setCommandsMenuOpen,
          creditMenuOpen,
          setCreditMenuOpen,
          documentationMenuOpen,
          setDocumentationMenuOpen,
          errorPagesMenuOpen,
          setErrorPagesMenuOpen,
          expensesMenuOpen,
          setExpensesMenuOpen,
          formElementsMenuOpen,
          setFormElementsMenuOpen,
          iconsMenuOpen,
          setIconsMenuOpen,
          investmentsMenuOpen,
          setInvestmentsMenuOpen,
          tablesMenuOpen,
          setTablesMenuOpen,
          travelMenuOpen,
          setTravelMenuOpen,
          userPagesMenuOpen,
          setUserPagesMenuOpen,
        }}
      />

      <SidebarActionModal
        modalOpen={modalOpen}
        currentModal={currentModal}
        setModalOpen={setModalOpen}
        handleSubmitModal={handleSubmitModal}
      />
    </nav>
  );
};

export default withRouter(Sidebar);
