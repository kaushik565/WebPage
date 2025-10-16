import { useMemo, useState } from "react";
import Grid from "@mui/material/Unstable_Grid2";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { useQuery } from "@tanstack/react-query";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  fetchBatchClosures,
  fetchBatchNumbers,
  fetchBatchSummary,
  fetchDailySummary
} from "../api.ts";
import DumpClosureView from "../components/DumpClosureView.tsx";
import MatrixClosureView from "../components/MatrixClosureView.tsx";
import { aggregateClosuresByBatch } from "../utils/closureFlow.ts";
import { format, parse } from "date-fns";

const LINE_LIST = ["A", "B", "C", "D", "E", "G"] as const;

type SummaryTileProps = {
  label: string;
  value: number | string;
};

const SummaryTile = ({ label, value }: SummaryTileProps) => (
  <Box
    sx={{
      px: 2.5,
      py: 1.5,
      borderRadius: 3,
      border: "1px solid rgba(148,163,184,0.25)",
      background: "rgba(15,23,42,0.035)",
      minWidth: 150
    }}
  >
    <Typography variant="subtitle2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>
      {value}
    </Typography>
  </Box>
);

function DashboardPage() {
  const displayDateFormat = "dd/MM/yyyy";
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), displayDateFormat));
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  const toDisplayDate = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : format(parsed, displayDateFormat);
  };

  const inputDatePattern = /^\d{2}\/\d{2}\/\d{4}$/;

  const getSortValue = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
  };

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["daily-summary"],
    queryFn: () => fetchDailySummary()
  });

  const { data: batchNumbers = [], isLoading: batchesLoading } = useQuery({
    queryKey: ["batch-numbers"],
    queryFn: fetchBatchNumbers
  });

  const {
    data: batchSummary,
    isFetching: batchSummaryLoading,
    isError: batchSummaryError
  } = useQuery({
    queryKey: ["batch-summary", selectedBatch],
    queryFn: () => fetchBatchSummary(selectedBatch),
    enabled: !!selectedBatch
  });

  const {
    data: batchClosures = [],
    isLoading: closuresLoading,
    isError: closuresError
  } = useQuery({
    queryKey: ["batch-closures"],
    queryFn: fetchBatchClosures
  });

  const chartData = useMemo(() => {
    if (!summary) return [];
    const totals = summary.reduce<Record<string, number>>((acc, item) => {
      if (!item.date) {
        return acc;
      }
      acc[item.date] = (acc[item.date] ?? 0) + item.totalQuantity;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([date, total]) => ({
        date,
        total,
        displayDate: toDisplayDate(date),
        sortValue: getSortValue(date)
      }))
      .sort((a, b) => a.sortValue - b.sortValue);
  }, [summary]);

  const lineBreakdownForDate = useMemo(() => {
    if (!summary) {
      return null;
    }

    if (!selectedDate || !inputDatePattern.test(selectedDate)) {
      return null;
    }

    const parsed = parse(selectedDate, "dd/MM/yyyy", new Date());
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return null;
    }
    const isoDate = format(parsed, "yyyy-MM-dd");

    const totals = LINE_LIST.reduce<Record<string, number>>((acc, line) => {
      acc[line] = 0;
      return acc;
    }, {});

    summary.forEach((item) => {
      if (!item.date) {
        return;
      }
      const normalized =
        typeof item.date === "string"
          ? item.date.slice(0, 10)
          : format(new Date(item.date), "yyyy-MM-dd");
      if (normalized === isoDate) {
        if (!totals[item.line]) {
          totals[item.line] = 0;
        }
        totals[item.line] += item.totalQuantity;
      }
    });

    return totals;
  }, [selectedDate, summary]);

  const dumpClosures = useMemo(
    () =>
      batchClosures
        .filter((closure) => closure.stageType === "DumpToAnnealing")
        .sort((a, b) => (b.productionDate || "").localeCompare(a.productionDate || "")),
    [batchClosures]
  );

  const matrixClosures = useMemo(
    () =>
      batchClosures
        .filter((closure) => closure.stageType === "MatrixToPouch")
        .sort((a, b) => (b.productionDate || "").localeCompare(a.productionDate || "")),
    [batchClosures]
  );

  const flowRows = useMemo(() => aggregateClosuresByBatch(batchClosures), [batchClosures]);

  const dumpTotals = useMemo(
    () => ({
      lots: dumpClosures.length,
      accepted: dumpClosures.reduce((sum, item) => sum + Number(item.totalAccepted ?? 0), 0),
      annealing: dumpClosures.reduce((sum, item) => sum + Number(item.totalAnnealing ?? 0), 0),
      rejections: dumpClosures.reduce((sum, item) => sum + Number(item.totalRejections ?? 0), 0),
      dumpRejections: dumpClosures.reduce(
        (sum, item) => sum + Number(item.dumpTotalRejections ?? 0),
        0
      )
    }),
    [dumpClosures]
  );

  const matrixTotals = useMemo(
    () => ({
      lots: matrixClosures.length,
      accepted: matrixClosures.reduce((sum, item) => sum + Number(item.totalAccepted ?? 0), 0),
      output: matrixClosures.reduce((sum, item) => sum + Number(item.totalAnnealing ?? 0), 0),
      rejections: matrixClosures.reduce((sum, item) => sum + Number(item.totalRejections ?? 0), 0)
    }),
    [matrixClosures]
  );

  const matrixStageRejections = useMemo(() => {
    return matrixClosures.reduce(
      (acc, closure) => {
        const stageData = closure.stageData as
          | {
              rejectionStages?: {
                vi2?: number;
                vi3?: number;
                vacuum?: number;
                vi4?: number;
                vi4Rework?: number;
              };
            }
          | null;
        if (stageData?.rejectionStages) {
          acc.vi2 += Number(stageData.rejectionStages.vi2 ?? 0);
          acc.vi3 += Number(stageData.rejectionStages.vi3 ?? 0);
          acc.vacuum += Number(stageData.rejectionStages.vacuum ?? 0);
          acc.vi4 += Number(stageData.rejectionStages.vi4 ?? 0);
          acc.vi4Rework += Number(stageData.rejectionStages.vi4Rework ?? 0);
        }
        return acc;
      },
      { vi2: 0, vi3: 0, vacuum: 0, vi4: 0, vi4Rework: 0 }
    );
  }, [matrixClosures]);

  return (
    <Stack spacing={4}>
      <Box
        sx={{
          mb: 1
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Production Quality Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth={650}>
          Monitor batch health, daily rejection trends, and stage performance at a glance.
        </Typography>
      </Box>

      <Paper
        sx={{
          p: 3,
          border: "1px solid rgba(148,163,184,0.2)",
          backdropFilter: "blur(6px)"
        }}
      >
        <Stack spacing={2} direction={{ xs: "column", sm: "row" }} alignItems="center">
          <TextField
            label="Select Date (dd/MM/yyyy)"
            placeholder="dd/MM/yyyy"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            sx={{ minWidth: { sm: 240 } }}
            inputProps={{ inputMode: "numeric", pattern: "\\d{2}/\\d{2}/\\d{4}" }}
          />
          <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center" width="100%">
            {lineBreakdownForDate ? (
              Object.entries(lineBreakdownForDate).map(([line, total]) => (
                <Box
                  key={line}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    borderRadius: 3,
                    border: "1px solid rgba(148,163,184,0.25)",
                    background: "rgba(0,85,165,0.06)",
                    minWidth: 120,
                    textAlign: "center"
                  }}
                >
                  <Typography variant="subtitle2">Line {line}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {total}
                  </Typography>
                </Box>
              ))
            ) : (
              <Alert severity="info">Select a date to view line totals.</Alert>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              background: `linear-gradient(135deg, ${alpha("#0055a5", 0.92)} 0%, ${alpha(
                "#00a76f",
                0.92
              )} 100%)`,
              color: "common.white"
            }}
          >
            <CardHeader
              title="Batch Spotlight"
              subheader="Select a batch to analyse stage contribution."
              sx={{
                "& .MuiCardHeader-subheader": {
                  color: alpha("#ffffff", 0.8)
                }
              }}
            />
            <CardContent>
              <FormControl fullWidth variant="filled" sx={{ mb: 2 }}>
                <InputLabel sx={{ color: "common.white" }}>Batch Number</InputLabel>
                <Select
                  value={selectedBatch}
                  onChange={(event) => setSelectedBatch(event.target.value)}
                  sx={{
                    color: "common.white",
                    "& .MuiSvgIcon-root": { color: "common.white" }
                  }}
                >
                  <MenuItem value="">
                    <em>{batchesLoading ? "Loading..." : "Select Batch"}</em>
                  </MenuItem>
                  {batchNumbers.map((batch) => (
                    <MenuItem key={batch} value={batch}>
                      {batch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedBatch === "" && !batchesLoading && (
                <Typography variant="body2" sx={{ color: alpha("#ffffff", 0.85) }}>
                  Pick a batch number to reveal total counts and contribution per stage.
                </Typography>
              )}

              {batchSummaryError && <Alert severity="error">Could not load batch summary.</Alert>}

              {batchSummaryLoading && selectedBatch && (
                <Box textAlign="center" py={2}>
                  <CircularProgress size={24} sx={{ color: "common.white" }} />
                </Box>
              )}

              {batchSummary && (
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha("#000", 0.2),
                      borderRadius: 3
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: alpha("#ffffff", 0.7) }}>
                      Total Rejections
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {batchSummary.totalQuantity}
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha("#ffffff", 0.7) }}>
                      {batchSummary.totalRecords} records logged
                    </Typography>
                  </Box>

                  {batchSummary.stageBreakdown.length ? (
                    <Stack spacing={1.5}>
                      {batchSummary.stageBreakdown.map((item) => (
                        <Box
                          key={item.stage}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            bgcolor: alpha("#000", 0.18),
                            borderRadius: 3,
                            px: 2,
                            py: 1.5
                          }}
                        >
                          <Typography variant="subtitle2">{item.stage}</Typography>
                          <Typography variant="subtitle2">{item.totalQuantity}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info">No rejections recorded for this batch.</Alert>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              height: "100%"
            }}
          >
            <Typography variant="h6" gutterBottom>
              Stage Contribution
            </Typography>
            {batchSummary && batchSummary.stageBreakdown.length > 0 ? (
              <PieChart
                height={320}
                series={[
                  {
                    data: batchSummary.stageBreakdown.map((item, index) => ({
                      id: item.stage,
                      value: item.totalQuantity,
                      label: item.stage,
                      color: ["#0055a5", "#007bc0", "#009f9d", "#00a76f", "#7ad5a7"][index % 5]
                    })),
                    innerRadius: 60,
                    outerRadius: 140,
                    paddingAngle: 2,
                    cornerRadius: 4
                  }
                ]}
                slotProps={{
                  legend: {
                    hidden: false,
                    direction: "column",
                    position: { horizontal: "right", vertical: "middle" }
                  }
                }}
              />
            ) : (
              <Alert severity="info">Select a batch with data to view stage contribution.</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {isLoading && (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 4 }}>
          <CircularProgress />
        </Paper>
      )}

      {isError && <Alert severity="error">Could not load dashboard data.</Alert>}

      {!isLoading && !isError && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Daily Rejection Totals
          </Typography>
          {chartData.length ? (
            <BarChart
              height={320}
              xAxis={[
                {
                  scaleType: "band",
                  data: chartData.map((item) => item.displayDate),
                  label: "Date"
                }
              ]}
              series={[
                {
                  data: chartData.map((item) => item.total),
                  label: "Total Qty",
                  color: "#0055a5"
                }
              ]}
              margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
            />
          ) : (
            <Alert severity="info">No data for the selected range.</Alert>
          )}
        </Paper>
      )}

      {!isLoading && !isError && flowRows.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Batch Flow Readiness
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tracks how each batch progresses from dump rejects through QC deductions. Dispatch quantity reflects pouch output minus QC consumption and retained samples.
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Batch</TableCell>
                  <TableCell align="right">Initial Qty</TableCell>
                  <TableCell align="right">Dump Rejects</TableCell>
                  <TableCell align="right">Matrix Input</TableCell>
                  <TableCell align="right">Matrix Rejects</TableCell>
                  <TableCell align="right">Pouch Output</TableCell>
                  <TableCell align="right">QC Consumed</TableCell>
                  <TableCell align="right">QC Retained</TableCell>
                  <TableCell align="right">Dispatch Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {flowRows.slice(0, 5).map((row) => (
                  <TableRow key={row.batchNumber}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.batchNumber}</TableCell>
                    <TableCell align="right">{row.initialBatchQuantity.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.dumpRejections.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.matrixInput.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.matrixRejections.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.pouchOutput.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.qcConsumed.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.qcRetained.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {row.dispatchQuantity.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Batch Closure Overview
        </Typography>
        {closuresLoading && (
          <Box sx={{ py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {closuresError && <Alert severity="error">Could not load batch closures.</Alert>}
        {!closuresLoading && !closuresError && batchClosures.length === 0 && (
          <Alert severity="info">No batch closures recorded yet.</Alert>
        )}

        {!closuresLoading && !closuresError && batchClosures.length > 0 && (
          <Stack spacing={4}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Dump → Annealing
              </Typography>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2} flexWrap="wrap">
                <SummaryTile label="Lots Logged" value={dumpTotals.lots} />
                <SummaryTile label="Total Accepted" value={dumpTotals.accepted} />
                <SummaryTile label="Total Annealing" value={dumpTotals.annealing} />
                <SummaryTile label="Total Rejections" value={dumpTotals.rejections} />
                <SummaryTile
                  label="Dump Total Rejections"
                  value={dumpTotals.dumpRejections}
                />
              </Stack>
              <Stack spacing={1.5}>
                {dumpClosures.map((closure) => (
                  <Accordion key={closure.id} disableGutters>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        px: { xs: 1.5, md: 2 },
                        "& .MuiAccordionSummary-content": {
                          flexDirection: { xs: "column", sm: "row" },
                          gap: 1.5
                        }
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {closure.batchNumber} ·{" "}
                        {closure.lotLabel ?? `Lot ${closure.lotNumber ?? "-"}`}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={`Line: ${closure.line ?? "-"}`} size="small" />
                        <Chip label={`Date: ${closure.productionDate ?? "-"}`} size="small" />
                        <Chip label={`Shift: ${closure.shift ?? "-"}`} size="small" />
                        <Chip
                          label={`Accepted: ${closure.totalAccepted ?? 0}`}
                          color="success"
                          size="small"
                        />
                        <Chip
                          label={`Rejections: ${closure.totalRejections ?? 0}`}
                          color="warning"
                          size="small"
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 1.5, md: 2 }, pb: 2 }}>
                      <DumpClosureView closure={closure} disablePaper />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Stack>

            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Matrix → Pouch
              </Typography>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2} flexWrap="wrap">
                <SummaryTile label="Lots Logged" value={matrixTotals.lots} />
                <SummaryTile label="Total Accepted" value={matrixTotals.accepted} />
                <SummaryTile label="Total Output" value={matrixTotals.output} />
                <SummaryTile label="Total Rejections" value={matrixTotals.rejections} />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`VI-2: ${matrixStageRejections.vi2}`} size="small" />
                <Chip label={`VI-3: ${matrixStageRejections.vi3}`} size="small" />
                <Chip label={`Vacuum: ${matrixStageRejections.vacuum}`} size="small" />
                <Chip label={`VI-4: ${matrixStageRejections.vi4}`} size="small" />
                <Chip label={`VI-4 Rework: ${matrixStageRejections.vi4Rework}`} size="small" />
              </Stack>
              <Stack spacing={1.5}>
                {matrixClosures.map((closure) => (
                  <Accordion key={closure.id} disableGutters>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        px: { xs: 1.5, md: 2 },
                        "& .MuiAccordionSummary-content": {
                          flexDirection: { xs: "column", sm: "row" },
                          gap: 1.5
                        }
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {closure.batchNumber} ·{" "}
                        {closure.lotLabel ?? `Lot ${closure.lotNumber ?? "-"}`}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={`Line: ${closure.line ?? "-"}`} size="small" />
                        <Chip label={`Date: ${closure.productionDate ?? "-"}`} size="small" />
                        <Chip label={`Shift: ${closure.shift ?? "-"}`} size="small" />
                        <Chip
                          label={`Accepted: ${closure.totalAccepted ?? 0}`}
                          color="success"
                          size="small"
                        />
                        <Chip
                          label={`Output: ${closure.totalAnnealing ?? 0}`}
                          color="info"
                          size="small"
                        />
                        <Chip
                          label={`Rejections: ${closure.totalRejections ?? 0}`}
                          color="warning"
                          size="small"
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 1.5, md: 2 }, pb: 2 }}>
                      <MatrixClosureView closure={closure} disablePaper />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

export default DashboardPage;
