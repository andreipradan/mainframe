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
import face15 from '../../assets/images/faces/face15.jpg';
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
const SidebarSubMenu = React.forwardRef(({ id, children, ...props }, ref) => (
  <div {...props} id={id} ref={ref}>
    <ul className='nav flex-column sub-menu'>{children}</ul>
  </div>
));

/** Renders an accessible collapsible navigation item and its child links. */
const SidebarMenu = ({
  active,
  open,
  onToggle,
  id,
  label,
  ariaLabel = label,
  icon,
  children,
}) => (
  <li className={menuItemClass(active)}>
    <button
      type='button'
      className={menuToggleClass(open)}
      aria-expanded={open}
      aria-controls={id}
      aria-label={`${ariaLabel} menu`}
      title={`${ariaLabel} menu`}
      onClick={onToggle}
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

/** Groups the staff identity and service-action menu in the profile row. */
const StaffProfileDetails = ({
  user,
  token,
  loading,
  handleSetModalAction,
  setModalOpen,
  setCurrentModal,
}) => (
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
      <StaffProfileDetails
        user={user}
        token={token}
        loading={loading}
        handleSetModalAction={handleSetModalAction}
        setModalOpen={setModalOpen}
        setCurrentModal={setCurrentModal}
      />
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
    <SidebarRouteItem
      path='/'
      active={isPathExact('/')}
      icon='mdi-view-dashboard'
    >
      <Trans>Dashboard</Trans>
    </SidebarRouteItem>
  </>
);

/** Renders the staff-only template navigation groups. */
const StaffTemplateNavigation = ({ navigation }) => {
  const { openMenuId, toggleMenu, isPathActive } = navigation;
  const menuGroups = [
    {
      id: 'sidebar-basic-ui-menu',
      path: '/basic-ui',
      label: <Trans>Basic UI Elements</Trans>,
      icon: 'mdi-laptop',
      open: openMenuId === 'sidebar-basic-ui-menu',
      onToggle: () => toggleMenu('sidebar-basic-ui-menu'),
      links: [
        ['/basic-ui/buttons', <Trans key='/basic-ui/buttons'>Buttons</Trans>],
        [
          '/basic-ui/dropdowns',
          <Trans key='/basic-ui/dropdowns'>Dropdowns</Trans>,
        ],
        [
          '/basic-ui/typography',
          <Trans key='/basic-ui/typography'>Typography</Trans>,
        ],
      ],
    },
    {
      id: 'sidebar-form-elements-menu',
      path: '/form-elements',
      label: <Trans>Form Elements</Trans>,
      icon: 'mdi-playlist-play',
      open: openMenuId === 'sidebar-form-elements-menu',
      onToggle: () => toggleMenu('sidebar-form-elements-menu'),
      links: [
        [
          '/form-elements/basic-elements',
          <Trans key='/form-elements/basic-elements'>Basic Elements</Trans>,
        ],
      ],
    },
    {
      id: 'sidebar-tables-menu',
      path: '/tables',
      label: <Trans>Tables</Trans>,
      icon: 'mdi-table-large',
      open: openMenuId === 'sidebar-tables-menu',
      onToggle: () => toggleMenu('sidebar-tables-menu'),
      links: [
        [
          '/tables/basic-table',
          <Trans key='/tables/basic-table'>Basic Table</Trans>,
        ],
      ],
    },
    {
      id: 'sidebar-charts-menu',
      path: '/charts',
      label: <Trans>Charts</Trans>,
      icon: 'mdi-chart-bar',
      open: openMenuId === 'sidebar-charts-menu',
      onToggle: () => toggleMenu('sidebar-charts-menu'),
      links: [
        ['/charts/chart-js', <Trans key='/charts/chart-js'>Chart Js</Trans>],
      ],
    },
    {
      id: 'sidebar-icons-menu',
      path: '/icons',
      label: <Trans>Icons</Trans>,
      icon: 'mdi-contacts',
      open: openMenuId === 'sidebar-icons-menu',
      onToggle: () => toggleMenu('sidebar-icons-menu'),
      links: [['/icons/mdi', <Trans key='/icons/mdi'>Material</Trans>]],
    },
    {
      id: 'sidebar-user-pages-menu',
      path: '/login',
      active: isPathActive('/login') || isPathActive('/register'),
      label: <Trans>User Pages</Trans>,
      icon: 'mdi-security',
      open: openMenuId === 'sidebar-user-pages-menu',
      onToggle: () => toggleMenu('sidebar-user-pages-menu'),
      links: [
        ['/login', <Trans key='/login'>Login</Trans>],
        ['/register', <Trans key='/register'>Register</Trans>],
      ],
    },
    {
      id: 'sidebar-error-pages-menu',
      path: '/error-pages',
      label: <Trans>Error Pages</Trans>,
      icon: 'mdi-lock',
      open: openMenuId === 'sidebar-error-pages-menu',
      onToggle: () => toggleMenu('sidebar-error-pages-menu'),
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
            <SidebarSubmenuLink
              key={path}
              path={path}
              isActive={isPathActive(path)}
            >
              {label}
            </SidebarSubmenuLink>
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
    <img className='img-xs rounded-circle ' src={face15} alt='profile' />
    <span className='count bg-success' />
  </div>
);

/** Renders authenticated users' travel menu and its route links. */
const TravelNavigation = ({ navigation }) => {
  const { isPathActive, isPathExact, openMenuId, toggleMenu } = navigation;

  return (
    <>
      <li className='nav-item nav-category'>
        <span className='nav-link'>Expenses & Rates</span>
      </li>
      <SidebarMenu
        path='/expenses/travel'
        active={isPathActive('/expenses/travel')}
        open={openMenuId === 'sidebar-travel-menu'}
        onToggle={() => toggleMenu('sidebar-travel-menu')}
        id='sidebar-travel-menu'
        label='Travel'
        icon='mdi-earth'
      >
        <SidebarSubmenuLink
          path='/expenses/travel/my'
          isActive={isPathExact('/expenses/travel/my')}
        >
          My expenses
        </SidebarSubmenuLink>
        <SidebarSubmenuLink
          path='/expenses/travel/groups'
          isActive={isPathActive('/expenses/travel/groups')}
        >
          My groups
        </SidebarSubmenuLink>
      </SidebarMenu>
    </>
  );
};

/** Renders a linked item inside a collapsible sidebar menu. */
const SidebarSubmenuLink = ({ path, isActive, icon, children }) => (
  <li className='nav-item'>
    <Link className={navLinkClass(isActive)} to={path}>
      {icon && <i className={`mdi ${icon}`} />}
      {icon && ' '}
      {children}
    </Link>
  </li>
);

/** Renders a top-level sidebar route with its icon and label. */
const SidebarRouteItem = ({ path, active, icon, children }) => (
  <li className={menuItemClass(active)}>
    <Link className='nav-link' to={path}>
      <span className='menu-icon'>
        <i className={`mdi ${icon}`} />
      </span>
      <span className='menu-title'>{children}</span>
    </Link>
  </li>
);

/** Renders a configured collapsible group and its child routes. */
const SidebarMenuGroup = ({ group, isPathActive }) => (
  <SidebarMenu
    active={group.active}
    open={group.open}
    onToggle={group.onToggle}
    id={group.id}
    label={group.label}
    icon={group.icon}
  >
    {group.links.map(({ path, label, icon }) => (
      <SidebarSubmenuLink
        key={path}
        path={path}
        isActive={isPathActive(path)}
        icon={icon}
      >
        {label}
      </SidebarSubmenuLink>
    ))}
  </SidebarMenu>
);

/** Renders the external documentation link in the staff sidebar. */
const SidebarExternalLink = ({ href, icon, children }) => (
  <li className='nav-item menu-items'>
    <a
      className='nav-link'
      href={href}
      rel='noopener noreferrer'
      target='_blank'
    >
      <span className='menu-icon'>
        <i className={`mdi ${icon}`} />
      </span>
      <span className='menu-title'>{children}</span>
    </a>
  </li>
);

/** Renders the staff profile and route-aware administrative menus. */
const StaffNavigation = ({ navigation }) => {
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
    openMenuId,
    toggleMenu,
  } = navigation;

  const items = [
    {
      kind: 'menu',
      id: 'sidebar-apps-menu',
      path: '/apps',
      label: <Trans key='apps'>Apps</Trans>,
      icon: 'mdi-apps',
      open: openMenuId === 'sidebar-apps-menu',
      onToggle: () => toggleMenu('sidebar-apps-menu'),
      links: [
        {
          path: '/apps/logs',
          icon: 'mdi-file-document-outline',
          label: 'Logs',
        },
        { path: '/apps/messages', icon: 'mdi-message-text', label: 'Messages' },
        { path: '/apps/todo', icon: 'mdi-clipboard-list', label: 'To do list' },
      ],
    },
    {
      kind: 'menu',
      id: 'sidebar-auth-menu',
      path: '/auth',
      label: 'Auth',
      icon: 'mdi-account-multiple',
      open: openMenuId === 'sidebar-auth-menu',
      onToggle: () => toggleMenu('sidebar-auth-menu'),
      links: [
        { path: '/auth/groups', label: 'Groups' },
        { path: '/auth/users', label: 'Users' },
      ],
    },
    {
      kind: 'route',
      path: '/bots',
      active: isPathActive('/bots'),
      icon: 'mdi-robot',
      label: 'Bots',
    },
    {
      kind: 'menu',
      id: 'sidebar-commands-menu',
      path: '/commands',
      label: 'Commands',
      icon: 'mdi-console',
      open: openMenuId === 'sidebar-commands-menu',
      onToggle: () => toggleMenu('sidebar-commands-menu'),
      links: [
        { path: '/commands/crons', icon: 'mdi-timer-sand', label: 'Crons' },
        {
          path: '/commands/management',
          icon: 'mdi-account',
          label: 'Management',
        },
        { path: '/commands/tasks', icon: 'mdi-view-list', label: 'Tasks' },
        {
          path: '/commands/watchers',
          icon: 'mdi-eye-settings-outline',
          label: 'Watchers',
        },
      ],
    },
    {
      kind: 'route',
      path: '/devices',
      active: isPathActive('/devices'),
      icon: 'mdi-devices',
      label: 'Devices',
    },
    {
      kind: 'route',
      path: '/events',
      active: isPathActive('/events'),
      icon: 'mdi-calendar-multiselect',
      label: 'Events',
    },
    {
      kind: 'route',
      path: '/sources',
      active: isPathActive('/sources'),
      icon: 'mdi-network',
      label: 'Sources',
    },
    { kind: 'category', id: 'finance-category', label: 'Finance' },
    {
      kind: 'menu',
      id: 'sidebar-accounts-menu',
      path: '/finances/accounts',
      label: 'Accounts',
      icon: 'mdi-credit-card-outline',
      open: openMenuId === 'sidebar-accounts-menu',
      onToggle: () => toggleMenu('sidebar-accounts-menu'),
      links: [
        { path: '/finances/accounts/transactions', label: 'Overview' },
        { path: '/finances/accounts/categorize', label: 'Categorize' },
      ],
    },
    {
      kind: 'menu',
      id: 'sidebar-credit-menu',
      path: '/credit',
      label: 'Credit',
      icon: 'mdi-cash-multiple',
      open: openMenuId === 'sidebar-credit-menu',
      onToggle: () => toggleMenu('sidebar-credit-menu'),
      links: [
        { path: '/credit/details', label: 'Details' },
        { path: '/credit/calculator', label: 'Calculator' },
        { path: '/credit/payments', label: 'Payments' },
        { path: '/credit/timetables', label: 'Timetables' },
      ],
    },
    {
      kind: 'menu',
      id: 'sidebar-expenses-menu',
      path: '/expenses',
      label: 'Expenses',
      icon: 'mdi-account-cash-outline',
      open: openMenuId === 'sidebar-expenses-menu',
      onToggle: () => toggleMenu('sidebar-expenses-menu'),
      links: [{ path: '/expenses/car', label: 'Car' }],
    },
    {
      kind: 'route',
      path: '/fx-rates',
      active: isPathExact('/fx-rates'),
      icon: 'mdi-chart-line',
      label: 'FX Rates',
    },
    {
      kind: 'menu',
      id: 'sidebar-investments-menu',
      path: '/investments',
      label: 'Investments',
      icon: 'mdi-cash-multiple',
      open: openMenuId === 'sidebar-investments-menu',
      onToggle: () => toggleMenu('sidebar-investments-menu'),
      links: [
        { path: '/investments/summary', label: 'Summary' },
        { path: '/investments/bonds', label: 'Bonds' },
        { path: '/investments/crypto', label: 'Crypto' },
        { path: '/investments/deposits', label: 'Deposits' },
        { path: '/investments/pension', label: 'Pension' },
        { path: '/investments/stocks', label: 'Stocks' },
      ],
    },
  ];

  return (
    <>
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
      {items.map((item) => {
        if (item.kind === 'category') {
          return (
            <li className='nav-item nav-category' key={item.id}>
              <span className='nav-link'>{item.label}</span>
            </li>
          );
        }
        if (item.kind === 'route') {
          return (
            <SidebarRouteItem
              key={item.path}
              path={item.path}
              active={item.active}
              icon={item.icon}
            >
              {item.label}
            </SidebarRouteItem>
          );
        }
        return (
          <SidebarMenuGroup
            key={item.id}
            group={{ ...item, active: isPathActive(item.path) }}
            isPathActive={isPathActive}
          />
        );
      })}
    </>
  );
};

/** Renders authenticated users' travel and public route links. */
const PublicNavigation = ({ navigation }) => {
  const { isPathActive } = navigation;

  return (
    <>
      <TravelNavigation navigation={navigation} />
      <li className='nav-item nav-category'>
        <span className='nav-link'>Public</span>
      </li>
      <SidebarRouteItem
        path='/earthquakes'
        active={isPathActive('/earthquakes')}
        icon='mdi-earth'
      >
        Earthquakes
      </SidebarRouteItem>
      <SidebarRouteItem
        path='/meals'
        active={isPathActive('/meals')}
        icon='mdi-food'
      >
        Meals
      </SidebarRouteItem>
      <SidebarRouteItem
        path='/transport'
        active={isPathActive('/transport')}
        icon='mdi-bus'
      >
        Transport
      </SidebarRouteItem>
    </>
  );
};

/** Renders the always-available terms and conditions menu. */
const DocumentationNavigation = ({ navigation }) => (
  <SidebarMenu
    active={navigation.isPathActive('/terms-and-conditions')}
    open={navigation.openMenuId === 'sidebar-documentation-menu'}
    onToggle={() => navigation.toggleMenu('sidebar-documentation-menu')}
    id='sidebar-documentation-menu'
    label='Docs'
    ariaLabel='Documentation'
    icon='mdi-file-document'
  >
    <SidebarSubmenuLink
      path='/terms-and-conditions'
      isActive={navigation.isPathActive('/terms-and-conditions')}
    >
      Terms and Conditions
    </SidebarSubmenuLink>
  </SidebarMenu>
);

/** Adds the staff templates menu and external documentation link. */
const StaffTemplateFooter = ({ navigation }) => (
  <>
    <StaffTemplateNavigation navigation={navigation} />
    <SidebarExternalLink
      href='https://bootstrapdash.com/demo/corona-react-free/documentation/documentation.html'
      icon='mdi-file-document-box'
    >
      <Trans>Documentation</Trans>
    </SidebarExternalLink>
  </>
);

/** Renders the staff, public, and shared sidebar navigation. */
const SidebarNavigation = ({ navigation }) => (
  <ul className='nav'>
    {navigation.user?.is_staff && <StaffNavigation navigation={navigation} />}
    {navigation.user && <PublicNavigation navigation={navigation} />}
    <DocumentationNavigation navigation={navigation} />
    {navigation.user?.is_staff && (
      <StaffTemplateFooter navigation={navigation} />
    )}
  </ul>
);

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

  const [openMenuId, setOpenMenuId] = useState(null);

  /** Keeps at most one sidebar menu expanded at a time. */
  const toggleMenu = (menuId) => {
    setOpenMenuId((currentMenuId) =>
      currentMenuId === menuId ? null : menuId
    );
  };

  /** Checks whether the current route starts with a navigation path. */
  const isPathActive = (path) => location.pathname.startsWith(path);
  const onRouteChanged = () => {
    document.querySelector('#sidebar').classList.remove('active');

    const dropdownPaths = [
      { path: '/apps', id: 'sidebar-apps-menu' },
      { path: '/auth', id: 'sidebar-auth-menu' },
      { path: '/basic-ui', id: 'sidebar-basic-ui-menu' },
      { path: '/credit', id: 'sidebar-credit-menu' },
      { path: '/commands', id: 'sidebar-commands-menu' },
      { path: '/expenses/car', id: 'sidebar-expenses-menu' },
      { path: '/expenses/travel', id: 'sidebar-travel-menu' },
      { path: '/finances/accounts', id: 'sidebar-accounts-menu' },
      { path: '/form-elements', id: 'sidebar-form-elements-menu' },
      { path: '/investments', id: 'sidebar-investments-menu' },
      { path: '/tables', id: 'sidebar-tables-menu' },
      { path: '/icons', id: 'sidebar-icons-menu' },
      { path: '/charts', id: 'sidebar-charts-menu' },
      { path: '/login', id: 'sidebar-user-pages-menu' },
      { path: '/register', id: 'sidebar-user-pages-menu' },
      { path: '/error-pages', id: 'sidebar-error-pages-menu' },
      {
        path: '/terms-and-conditions',
        id: 'sidebar-documentation-menu',
      },
    ];

    const activeMenu = dropdownPaths.find((menu) => isPathActive(menu.path));
    setOpenMenuId(activeMenu?.id ?? null);
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
          openMenuId,
          toggleMenu,
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
