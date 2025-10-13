import { useEffect, useMemo, useState } from "react";
import { AppBar, Box, Button, Container, CssBaseline, Paper, Stack, Toolbar, Typography } from "@mui/material";
import { ThemeProvider, StyledEngineProvider, createTheme } from "@mui/material/styles";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage.tsx";
import RejectionFormPage from "./pages/RejectionFormPage.tsx";
import BatchClosurePage from "./pages/BatchClosurePage.tsx";
import DispatchDetailsPage from "./pages/DispatchDetailsPage.tsx";

type UserRole = "QA" | "QC" | "Production";
const ROLE_STORAGE_KEY = "molbio:userRole";

function App() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ROLE_STORAGE_KEY);
      if (stored === "QA" || stored === "QC" || stored === "Production") {
        setRole(stored);
      }
    } catch {
      // ignore storage failures
    } finally {
      setRoleChecked(true);
    }
  }, []);

  const handleRoleSelect = (selected: UserRole) => {
    setRole(selected);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, selected);
    } catch {
      // ignore write error
    }
  };

  const handleRoleReset = () => {
    setRole(null);
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch {
      // ignore remove error
    }
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: { main: "#0055a5" },
          secondary: { main: "#00a76f" },
          background: { default: "#f4f6fb", paper: "#ffffff" }
        },
        typography: {
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          h5: { fontWeight: 600 },
          h6: { fontWeight: 600 }
        },
        shape: { borderRadius: 14 },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                background: "linear-gradient(135deg, #004b8d 0%, #0072b8 50%, #00a76f 100%)",
                boxShadow: "0px 8px 24px rgba(0,0,0,0.12)"
              }
            }
          },
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 12
              }
            }
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 18,
                boxShadow: "0px 16px 40px rgba(15, 23, 42, 0.08)"
              }
            }
          },
          MuiLinearProgress: {
            styleOverrides: {
              root: { borderRadius: 999, height: 6 },
              bar: { borderRadius: 999 }
            }
          }
        }
      }),
    []
  );

  const location = useLocation();

  const navLinks = useMemo(() => {
    const base = [{ label: "Dashboard", to: "/dashboard" }];
    if (role === "QA") {
      base.push(
        { label: "Rejections", to: "/rejections" },
        { label: "Batch Closure", to: "/batch-closures" },
        { label: "Dispatch Details", to: "/dispatch" }
      );
    }
    return base;
  }, [role]);

  if (!roleChecked) {
    return null;
  }

  if (!role) {
    const roleOptions: Array<{ label: UserRole; description: string }> = [
      {
        label: "QA",
        description: "Quality assurance toolkit for logging rejections, batch closures, and dispatch workflows."
      },
      {
        label: "QC",
        description: "Quality control insights highlighting production metrics and compliance checkpoints."
      },
      {
        label: "Production",
        description: "Operations companion for quick dashboards and shop-floor awareness."
      }
    ];

    return (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box
            sx={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
              px: 2,
              background: "radial-gradient(circle at top, #dbeafe 0%, #eff6ff 40%, #f4f6fb 100%)"
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -90,
                right: -70,
                width: 280,
                height: 280,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(0,85,165,0.2), rgba(0,167,111,0.15))"
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -80,
                left: -50,
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(0,167,111,0.18), rgba(0,119,182,0.12))"
              }}
            />
            <Paper
              elevation={12}
              sx={{
                maxWidth: 620,
                width: "100%",
                p: { xs: 4, md: 6 },
                borderRadius: 5,
                position: "relative",
                backdropFilter: "blur(10px)",
                background: "rgba(255,255,255,0.9)",
                boxShadow: "0 30px 70px rgba(15, 23, 42, 0.16)"
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 3, color: "primary.main" }}>
                Molbio Workspaces
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    background: "linear-gradient(120deg, #004b8d 0%, #007ac1 45%, #00a76f 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}
                >
                  Welcome! Select your department
                </Typography>
                <Box
                  sx={{
                    mt: 1.5,
                    width: 120,
                    height: 6,
                    borderRadius: 999,
                    background: "linear-gradient(120deg, rgba(0,85,165,0.4), rgba(0,167,111,0.65))"
                  }}
                />
              </Box>
              <Stack spacing={2.5}>
                {roleOptions.map((option) => (
                  <Button
                    key={option.label}
                    variant="contained"
                    disableElevation
                    onClick={() => handleRoleSelect(option.label)}
                    sx={{
                      justifyContent: "flex-start",
                      alignItems: "flex-start",
                      textAlign: "left",
                      py: 2.5,
                      px: 3,
                      borderRadius: 3,
                      background: "linear-gradient(135deg, #0055a5, #0077c5)",
                      boxShadow: "0px 22px 38px rgba(0,85,165,0.28)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      '&:hover': {
                        transform: "translateY(-3px)",
                        boxShadow: "0px 28px 48px rgba(0,85,165,0.32)",
                        background: "linear-gradient(135deg, #0067c0, #008fd3)"
                      }
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "common.white" }}>
                        {option.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
                        {option.description}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Stack>
            </Paper>
            <Box
              component="footer"
              sx={{
                position: "absolute",
                bottom: 32,
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(15, 23, 42, 0.7)",
                fontWeight: 500,
                letterSpacing: 0.3,
                zIndex: 1
              }}
            >
              Developed by QA Team Site-III
            </Box>
          </Box>
        </ThemeProvider>
      </StyledEngineProvider>
    );
  }

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            background: "radial-gradient(circle at top, #f0f5ff 0%, #f4f6fb 35%, #eef1f8 100%)"
          }}
        >
          <AppBar position="sticky" elevation={0}>
            <Toolbar sx={{ py: 1.5, gap: 1 }}>
              <Typography variant="h5" sx={{ flexGrow: 1, letterSpacing: 0.5 }}>
                Molbio Diagnostics Limited
              </Typography>
              {navLinks.map((link) => {
                const active = location.pathname.startsWith(link.to);
                return (
                  <Button
                    key={link.to}
                    component={Link}
                    to={link.to}
                    color={active ? "secondary" : "inherit"}
                    sx={{
                      color: "white",
                      bgcolor: active ? "rgba(255,255,255,0.15)" : "transparent",
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.25)"
                      }
                    }}
                  >
                    {link.label}
                  </Button>
                );
              })}
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleRoleReset}
                sx={{
                  borderColor: "rgba(255,255,255,0.6)",
                  color: "white",
                  "&:hover": { borderColor: "white" }
                }}
              >
                Change Role ({role})
              </Button>
            </Toolbar>
          </AppBar>
          <Container
            maxWidth="xl"
            sx={{
              py: { xs: 4, md: 6 }
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/rejections"
                element={role === "QA" ? <RejectionFormPage /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="/batch-closures"
                element={role === "QA" ? <BatchClosurePage /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="/dispatch"
                element={role === "QA" ? <DispatchDetailsPage /> : <Navigate to="/dashboard" replace />}
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Container>
          <Box
            component="footer"
            sx={{
              py: 3,
              textAlign: "center",
              color: "rgba(15, 23, 42, 0.7)",
              fontWeight: 500,
              letterSpacing: 0.3
            }}
          >
            Developed by QA Team Site-III
          </Box>
        </Box>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
