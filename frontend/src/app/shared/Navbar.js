import React from 'react';
import { Dropdown } from 'react-bootstrap';
import {Link, useHistory} from 'react-router-dom';
import { Trans } from 'react-i18next';
import AuthApi from "../../api/auth";
import { useDispatch, useSelector } from "react-redux";
import logoMini from "../../assets/images/logo-mini.svg"

const Navbar = () => {
  const dispatch = useDispatch()
  const history = useHistory();
  const token = useSelector(state => state.auth.token)
  const user = useSelector(state => state.auth.user)


  const toggleOffcanvas = () => {
    document.querySelector('.sidebar-offcanvas').classList.toggle('active');
  }
  return (
      <nav className="navbar p-0 fixed-top d-flex flex-row">
        <div className="navbar-brand-wrapper d-flex d-lg-none align-items-center justify-content-center">
          <Link className="navbar-brand brand-logo-mini" to={user?.is_staff ? "/" : "/expenses"}>
            <img src={logoMini} alt="logo"/>
          </Link>
        </div>
        <div className="navbar-menu-wrapper flex-grow d-flex align-items-stretch">
          <button className="navbar-toggler align-self-center" type="button"
                  onClick={() => document.body.classList.toggle('sidebar-icon-only')}>
            <span className="mdi mdi-menu" />
          </button>
          <ul className="navbar-nav w-100">
            <li className="nav-item w-100">
              <form className="nav-link mt-2 mt-md-0 d-none d-lg-flex search">
                <input type="text" className="form-control" placeholder="Search products"/>
              </form>
            </li>
          </ul>
          <ul className="navbar-nav navbar-nav-right">
            <Dropdown alignRight as="li" className="nav-item d-none d-lg-block">
              <Dropdown.Toggle className="nav-link btn btn-success create-new-button no-caret">
                + <Trans>Create New Project</Trans>
              </Dropdown.Toggle>

              <Dropdown.Menu className="navbar-dropdown preview-list create-new-dropdown-menu">
                <h6 className="p-3 mb-0"><Trans>Projects</Trans></h6>
                <Dropdown.Divider/>
                <Dropdown.Item href="!#" onClick={evt => evt.preventDefault()} className="preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-file-outline text-primary" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1"><Trans>Software Development</Trans></p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <Dropdown.Item href="!#" onClick={evt => evt.preventDefault()} className="preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-web text-info" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1"><Trans>UI Development</Trans></p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <Dropdown.Item href="!#" onClick={evt => evt.preventDefault()} className="preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-layers text-danger" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1"><Trans>Software Testing</Trans></p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <p className="p-3 mb-0 text-center"><Trans>See all projects</Trans></p>
              </Dropdown.Menu>
            </Dropdown>
            <li className="nav-item d-none d-lg-block">
              <a className="nav-link" href="!#" onClick={event => event.preventDefault()}>
                <i className="mdi mdi-view-grid" />
              </a>
            </li>
            <Dropdown alignRight as="li" className="nav-item border-left">
              <Dropdown.Toggle as="a" className="nav-link count-indicator cursor-pointer">
                <i className="mdi mdi-email" />
                <span className="count bg-success" />
              </Dropdown.Toggle>
              <Dropdown.Menu className="navbar-dropdown preview-list">
                <h6 className="p-3 mb-0"><Trans>Messages</Trans></h6>
                <Dropdown.Divider/>
                <Dropdown.Item href="!#" onClick={evt => evt.preventDefault()} className="preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <img src={require('../../assets/images/faces/face4.jpg')} alt="profile"
                           className="rounded-circle profile-pic"/>
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1"><Trans>Mark send you a message</Trans></p>
                    <p className="text-muted mb-0"> 1 <Trans>Minutes ago</Trans></p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <Dropdown.Item href="!#" onClick={evt => evt.preventDefault()} className="preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <img src={require('../../assets/images/faces/face2.jpg')} alt="profile"
                           className="rounded-circle profile-pic"/>
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1"><Trans>Cregh send you a message</Trans></p>
                    <p className="text-muted mb-0"> 15 <Trans>Minutes ago</Trans></p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <Dropdown.Item href="!#" onClick={evt => evt.preventDefault()} className="preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <img src={require('../../assets/images/faces/face3.jpg')} alt="profile"
                           className="rounded-circle profile-pic"/>
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject ellipsis mb-1"><Trans>Profile picture updated</Trans></p>
                    <p className="text-muted mb-0"> 18 <Trans>Minutes ago</Trans></p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <p className="p-3 mb-0 text-center">4 <Trans>new messages</Trans></p>
              </Dropdown.Menu>
            </Dropdown>
            <Dropdown alignRight as="li" className="nav-item border-left">
              <Dropdown.Toggle as="a" className="nav-link count-indicator cursor-pointer">
                <i className="mdi mdi-bell" />
                <span className="count bg-danger" />
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu navbar-dropdown preview-list">
                <h6 className="p-3 mb-0"><Trans>Notifications</Trans></h6>
                <Dropdown.Divider/>
                <Dropdown.Item className="dropdown-item preview-item" onClick={evt => evt.preventDefault()}>
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-calendar text-success" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject mb-1"><Trans>Event today</Trans></p>
                    <p className="text-muted ellipsis mb-0">
                      <Trans>Just a reminder that you have an event today</Trans>
                    </p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <Dropdown.Item className="dropdown-item preview-item" onClick={evt => evt.preventDefault()}>
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-settings text-danger" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <h6 className="preview-subject mb-1"><Trans>Settings</Trans></h6>
                    <p className="text-muted ellipsis mb-0">
                      <Trans>Update dashboard</Trans>
                    </p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <Dropdown.Item className="dropdown-item preview-item" onClick={evt => evt.preventDefault()}>
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-link-variant text-warning" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <h6 className="preview-subject mb-1"><Trans>Launch Admin</Trans></h6>
                    <p className="text-muted ellipsis mb-0">
                      <Trans>New admin wow</Trans>!
                    </p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <p className="p-3 mb-0 text-center"><Trans>See all notifications</Trans></p>
              </Dropdown.Menu>
            </Dropdown>
            <Dropdown alignRight as="li" className="nav-item">
              <Dropdown.Toggle as="a" className="nav-link cursor-pointer no-caret">
                <div className="navbar-profile">
                  <img className="img-xs rounded-circle" src={require('../../assets/images/faces/face15.jpg')}
                       alt="profile"/>
                  <p className="mb-0 d-none d-sm-block navbar-profile-name">{user.email}</p>
                  <i className="mdi mdi-menu-down d-none d-sm-block" />
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu className="navbar-dropdown preview-list navbar-profile-dropdown-menu">
                <h6 className="p-3 mb-0"><Trans>Profile</Trans></h6>
                <Dropdown.Divider/>
                <Dropdown.Item href="!#" onClick={evt => {
                  evt.preventDefault()
                  history.push("/profile")
                }
                } className="preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-settings text-success" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject mb-1">Settings</p>
                  </div>
                </Dropdown.Item>
                <Dropdown.Divider/>
                <Dropdown.Item
                    href="!#"
                    onClick={evt => {
                      evt.preventDefault()
                      dispatch(AuthApi.Logout(token, history))
                    }}
                    className="preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-logout text-danger" />
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject mb-1"><Trans>Log Out</Trans></p>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </ul>
          <button className="navbar-toggler navbar-toggler-right d-lg-none align-self-center" type="button"
                  onClick={toggleOffcanvas}>
            <span className="mdi mdi-format-line-spacing" />
          </button>
        </div>
      </nav>
  );
}
export default Navbar;
