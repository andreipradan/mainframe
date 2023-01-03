/**
=========================================================
* Soft UI Dashboard React - v2.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/soft-ui-dashboard-material-ui
* Copyright 2021 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useEffect, useState } from "react";

import clsx from "clsx";

import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import Icon from "@mui/material/Icon";

import SuiBox from "components/SuiBox";
import SuiTypography from "components/SuiTypography";
import SuiButton from "components/SuiButton";

import styles from "examples/Configurator/styles";

import BotsApi from "../../../api/bots";
import SuiInput from "../../../components/SuiInput";
import { useSoftUIController } from "context";
import { select, setErrors } from "../../../redux/botsSlice";
import { useAuth } from "../../../auth-context/auth.context";
import { useDispatch, useSelector } from "react-redux";
import { isArray } from "chart.js/helpers";

function Configurator() {
  const reduxDispatch = useDispatch();
  const errors = useSelector((state) => state.bots.errors);
  const selectedBot = useSelector((state) => state.bots.selectedBot);

  const [controller, dispatch] = useSoftUIController();
  const { openConfigurator, sidenavColor } = controller;
  const classes = styles({ sidenavColor });

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [token, setToken] = useState("");
  const [webhook, setWebhook] = useState("");
  const [whitelist, setWhitelist] = useState([]);

  useEffect(() => {
    if (openConfigurator && !selectedBot && !errors) clearFields();
  }, [openConfigurator]);

  const clearFields = () => {
    setName("");
    setToken("");
    setIsActive(false);
    setWebhook("");
    setWhitelist([]);
    if (errors) reduxDispatch(setErrors(null));
  };

  const fillFieldsFromSelectedBot = () => {
    setName(selectedBot.name);
    setIsActive(selectedBot.is_active);
    setToken(selectedBot.token);
    setWebhook(selectedBot.webhook);
    setWhitelist(selectedBot.whitelist);
  };

  useEffect(() => {
    if (selectedBot) fillFieldsFromSelectedBot();
    else clearFields();
  }, [selectedBot]);

  useEffect(() => {
    if (errors?.length) dispatch({ type: "OPEN_CONFIGURATOR", value: true });
  }, [errors]);

  let { user } = useAuth();

  const handleCloseConfigurator = async () => {
    if (errors) reduxDispatch(setErrors(null));
    dispatch({ type: "OPEN_CONFIGURATOR", value: false });
  };

  const addBot = async () => {
    reduxDispatch(
      BotsApi.postNewBot(user.token, {
        name: name,
        token: token,
        is_active: isActive,
        webhook: webhook,
        whitelist: isArray(whitelist) ? whitelist : whitelist?.split(","),
      })
    );
    await handleCloseConfigurator();
  };

  const updateBot = async () => {
    reduxDispatch(
      BotsApi.updateBot(user.token, selectedBot.id, {
        name: name,
        token: token,
        is_active: isActive,
        webhook: webhook,
        whitelist: isArray(whitelist) ? whitelist : whitelist?.split(","),
      })
    );
    await handleCloseConfigurator();
  };

  const deleteBot = async () => {
    reduxDispatch(BotsApi.delete(user.token, selectedBot.id));
    await handleCloseConfigurator();
  };

  return (
    <Drawer
      variant="permanent"
      classes={{
        paper: clsx(classes.configurator, {
          [classes.configurator_open]: openConfigurator,
          [classes.configurator_close]: !openConfigurator,
        }),
      }}
    >
      <SuiBox
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
        pt={3}
        pb={0.8}
        px={3}
      >
        <SuiBox>
          <SuiTypography variant="h5">
            {selectedBot
              ? `${selectedBot.markedForDeletion ? "Delete" : "Edit"} ${selectedBot.name}`
              : "Add a new bot"}
          </SuiTypography>
          <SuiTypography variant="body2" textColor="text">
            {selectedBot
              ? selectedBot.markedForDeletion
                ? "Are you sure you want to delete this bot?"
                : "Edit details"
              : "Fill in details"}{" "}
          </SuiTypography>
        </SuiBox>

        <Icon
          className={`font-bold ${classes.configurator_close_icon}`}
          onClick={async () => {
            reduxDispatch(select(null));
            await handleCloseConfigurator();
          }}
        >
          close
        </Icon>
      </SuiBox>
      {!selectedBot?.markedForDeletion && <Divider />}
      <SuiBox component="form" role="form">
        {!selectedBot?.markedForDeletion && (
          <>
            <SuiBox mb={0.5}>
              <SuiBox mb={1} ml={0.5}>
                <SuiTypography component="label" variant="caption" fontWeight="bold">
                  Name
                </SuiTypography>
              </SuiBox>
              <SuiInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="Name"
              />
            </SuiBox>
            <SuiBox mb={2}>
              <SuiBox mb={1} ml={0.5}>
                <SuiTypography component="label" variant="caption" fontWeight="bold">
                  Token
                </SuiTypography>
              </SuiBox>
              <SuiInput
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder="Token"
              />
            </SuiBox>
            <SuiBox display="flex" alignItems="center">
              <Switch checked={isActive} onChange={() => setIsActive(!isActive)} />
              <SuiTypography
                variant="button"
                fontWeight="regular"
                onClick={(e) => setIsActive(e.target.value)}
                customClass="cursor-pointer user-select-none"
              >
                &nbsp;&nbsp;Is Active?
              </SuiTypography>
            </SuiBox>
            <SuiBox mb={0.5}>
              <SuiBox mb={1} ml={0.5}>
                <SuiTypography component="label" variant="caption" fontWeight="bold">
                  Webhook
                </SuiTypography>
              </SuiBox>
              <SuiInput
                value={webhook}
                onChange={(event) => setWebhook(event.target.value)}
                type="url"
                placeholder="Webhook"
              />
            </SuiBox>
            <SuiBox mb={0.5}>
              <SuiBox mb={1} ml={0.5}>
                <SuiTypography component="label" variant="caption" fontWeight="bold">
                  Whitelist
                </SuiTypography>
              </SuiBox>
              <SuiInput
                value={whitelist}
                onChange={(event) => setWhitelist(event.target.value)}
                type="list"
                placeholder="Whitelist"
              />
            </SuiBox>
          </>
        )}
        <SuiBox mt={2} mb={2} textAlign="center">
          <h6
            style={{
              fontSize: ".8em",
              color: "red",
              textAlign: "center",
              fontWeight: 400,
              transition: ".2s all",
            }}
          >
            <ul>
              {errors?.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </h6>
        </SuiBox>

        <SuiBox mt={4} mb={1}>
          <SuiButton
            variant="gradient"
            buttonColor={selectedBot?.markedForDeletion ? "error" : "info"}
            fullWidth
            onClick={selectedBot ? (selectedBot.markedForDeletion ? deleteBot : updateBot) : addBot}
          >
            {selectedBot ? (selectedBot.markedForDeletion ? "Delete" : "Update") : "Add"}
          </SuiButton>
        </SuiBox>
      </SuiBox>
    </Drawer>
  );
}

export default Configurator;
