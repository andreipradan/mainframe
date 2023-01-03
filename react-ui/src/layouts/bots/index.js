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

// @mui material components
import Card from "@mui/material/Card";

// Soft UI Dashboard React components
import SuiBox from "components/SuiBox";
import SuiTypography from "components/SuiTypography";

// Soft UI Dashboard React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import styles from "layouts/bots/styles";

import { Table as MuiTable, TableCell } from "@mui/material";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import colors from "../../assets/theme/base/colors";
import typography from "../../assets/theme/base/typography";
import borders from "../../assets/theme/base/borders";
import BotsApi from "../../api/bots";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import SuiAvatar from "../../components/SuiAvatar";
import rocket from "../../assets/images/illustrations/rocket-white.png";
import SuiBadge from "../../components/SuiBadge";
import { useAuth } from "../../auth-context/auth.context";
import { select } from "../../redux/botsSlice";
import { useSoftUIController } from "../../context";
// import Link from "@mui/material/Link";
import SuiButton from "../../components/SuiButton";

const columns = [
  { name: "name", align: "left" },
  { name: "webhook", align: "left" },
  { name: "status", align: "center" },
  { name: "last called on", align: "center" },
  { name: "action", align: "center" },
];

function Bots() {
  const [, contextDispatch] = useSoftUIController();
  const botsList = useSelector((state) => state.bots.list);
  const dispatch = useDispatch();

  const classes = styles();
  const { light } = colors;
  const { size, fontWeightBold } = typography;
  const { borderWidth } = borders;
  let { user } = useAuth();

  useEffect(async () => {
    await BotsApi.getList(user.token, dispatch);
  }, []);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SuiBox py={3}>
        <SuiBox mb={3}>
          <Card>
            <SuiBox display="flex" justifyContent="space-between" alignItems="center" p={3}>
              <SuiTypography variant="h6">Telegram Bots</SuiTypography>
            </SuiBox>
            <SuiBox customClass={classes.tables_table}>
              <TableContainer>
                <MuiTable>
                  <SuiBox component="thead">
                    <TableRow>
                      {columns.map(({ name, align }, i) => {
                        const p = [0, columns.length - 1].includes(i) ? 3 : 1;
                        return (
                          <SuiBox
                            key={name}
                            component="th"
                            pt={1.5}
                            pb={1.25}
                            pl={align === "left" ? p : 3}
                            pr={align === "right" ? p : 3}
                            textAlign={align}
                            fontSize={size.xxs}
                            fontWeight={fontWeightBold}
                            color="secondary"
                            opacity={0.7}
                            borderBottom={`${borderWidth[1]} solid ${light.main}`}
                          >
                            {name.toUpperCase()}
                          </SuiBox>
                        );
                      })}
                    </TableRow>
                  </SuiBox>
                  <TableBody>
                    {!botsList?.length && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <SuiBox p={1} textAlign="center">
                            <SuiTypography variant="button" fontWeight="medium">
                              {"No bots"}
                            </SuiTypography>
                          </SuiBox>
                        </TableCell>
                      </TableRow>
                    )}
                    {botsList &&
                      botsList.map((bot, key) => {
                        return (
                          <TableRow key={`row-${key}`}>
                            <SuiBox component="td" p={1} textAlign="left">
                              <SuiTypography
                                variant="button"
                                fontWeight="regular"
                                textColor="secondary"
                                customClass="d-inline-block w-max"
                              >
                                <SuiBox display="flex" alignItems="center" px={1} py={0.5}>
                                  <SuiBox mr={2}>
                                    <SuiAvatar
                                      src={rocket}
                                      alt={bot.name}
                                      size="sm"
                                      variant="rounded"
                                    />
                                  </SuiBox>
                                  <SuiBox display="flex" flexDirection="column">
                                    <SuiTypography variant="button" fontWeight="medium">
                                      {bot.name}
                                    </SuiTypography>
                                    <SuiTypography variant="caption" textColor="secondary">
                                      {bot.token.slice(0, 4) +
                                        "****" +
                                        bot.token.slice(bot.token.length - 5, bot.token.length)}
                                    </SuiTypography>
                                  </SuiBox>
                                </SuiBox>
                              </SuiTypography>
                            </SuiBox>
                            <SuiBox component="td" p={1} textAlign="left">
                              <SuiTypography
                                variant="button"
                                fontWeight="regular"
                                textColor="secondary"
                                customClass="d-inline-block w-max"
                              >
                                <SuiTypography
                                  variant="caption"
                                  fontWeight="medium"
                                  textColor="text"
                                >
                                  {bot.webhook}
                                </SuiTypography>
                              </SuiTypography>
                            </SuiBox>
                            <SuiBox component="td" p={1} textAlign="center">
                              <SuiTypography
                                variant="button"
                                fontWeight="regular"
                                textColor="secondary"
                                customClass="d-inline-block w-max"
                              >
                                <SuiBadge
                                  variant="gradient"
                                  badgeContent={bot.is_active ? "online" : "offline"}
                                  color={bot.is_active ? "success" : "error"}
                                  size="extra-small"
                                />
                              </SuiTypography>
                            </SuiBox>
                            <SuiBox component="td" p={1} textAlign="center">
                              <SuiTypography
                                variant="button"
                                fontWeight="regular"
                                textColor="secondary"
                                customClass="d-inline-block w-max"
                              >
                                <SuiTypography
                                  variant="caption"
                                  textColor="secondary"
                                  fontWeight="medium"
                                >
                                  {bot.last_called_on || "-"}
                                </SuiTypography>
                              </SuiTypography>
                            </SuiBox>
                            <SuiBox component="td" p={1} textAlign="center">
                              <SuiTypography
                                variant="button"
                                fontWeight="regular"
                                textColor="secondary"
                                customClass="d-inline-block w-max"
                              >
                                <SuiTypography
                                  component="a"
                                  variant="caption"
                                  textColor="secondary"
                                  fontWeight="medium"
                                >
                                  <SuiButton
                                    buttonColor="dark"
                                    variant="text"
                                    onClick={() => {
                                      dispatch(select(bot));
                                      contextDispatch({
                                        type: "OPEN_CONFIGURATOR",
                                        value: true,
                                      });
                                    }}
                                  >
                                    edit
                                  </SuiButton>
                                  <SuiButton
                                    buttonColor="error"
                                    variant="text"
                                    onClick={() => {
                                      dispatch(select({ ...bot, markedForDeletion: true }));
                                      contextDispatch({
                                        type: "OPEN_CONFIGURATOR",
                                        value: true,
                                      });
                                    }}
                                  >
                                    delete
                                  </SuiButton>
                                </SuiTypography>
                              </SuiTypography>
                            </SuiBox>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            </SuiBox>
          </Card>
        </SuiBox>
      </SuiBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Bots;
