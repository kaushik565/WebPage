import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchBatchClosures } from "../api.ts";
import type { BatchClosure } from "../api.ts";
import { aggregateClosuresByBatch, type AggregatedFlowRow } from "../utils/closureFlow.ts";

type DispatchTab = "summary" | "create";

function DispatchDetailsPage() {
  const [activeTab, setActiveTab] = useState<DispatchTab>("summary");
  const {
    data: closures,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["batch-closures"],
    queryFn: fetchBatchClosures
  });

  const summaryRows = useMemo<AggregatedFlowRow[]>(() => {
    if (!closures || closures.length === 0) {
      return [];
    }
    return aggregateClosuresByBatch(closures as BatchClosure[]);
  }, [closures]);

  const formatNumber = (value: number) => value.toLocaleString();
  const formatQcValue = (value: number, pending: boolean) => (pending ? "-" : formatNumber(value));
  const formatDispatch = (row: AggregatedFlowRow) =>
    row.dispatchQuantity === null ? "Pending QC" : formatNumber(row.dispatchQuantity);
  const qcStatusLabel = (row: AggregatedFlowRow) => (row.qcPending ? "Pending" : "Complete");

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Dispatch Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review each batch’s journey from dump rejects to QC deductions and confirm dispatch-ready inventory for downstream planning.
        </Typography>
      </Box>

      <Card>
        <CardHeader title="Dispatch Workspace" />
        <Divider />
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_event, value) => setActiveTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mb: 3 }}
          >
            <Tab label="Recent Overview" value="summary" />
            <Tab label="Create Dispatch" value="create" />
          </Tabs>

          {activeTab === "summary" && (
            <>
              {isLoading && (
                <Stack alignItems="center" justifyContent="center" py={6}>
                  <CircularProgress />
                </Stack>
              )}

              {isError && !isLoading && (
                <Alert severity="error">
                  Unable to load dispatch data. Please try again after some time.
                </Alert>
              )}

              {!isLoading && !isError && summaryRows.length === 0 && (
                <Alert severity="info">
                  No dispatch data recorded yet. Capture batch closures to view dispatch readiness.
                </Alert>
              )}

              {!isLoading && !isError && summaryRows.length > 0 && (
                <Stack spacing={2.5}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Batch Dispatch Readiness
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dispatch quantity is derived from matrix pouch output after subtracting QC consumed and QC
                    retained cartridges.
                  </Typography>
                  <TableContainer sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Batch Number</TableCell>
                          <TableCell align="right">Initial Qty</TableCell>
                          <TableCell align="right">Dump Rejections</TableCell>
                          <TableCell align="right">To Matrix</TableCell>
                          <TableCell align="right">Matrix Rejections</TableCell>
                          <TableCell align="right">Pouch Output</TableCell>
                          <TableCell align="right">QC Consumed</TableCell>
                          <TableCell align="right">QC Retained</TableCell>
                          <TableCell align="right">QC Status</TableCell>
                          <TableCell align="right">Dispatch Quantity</TableCell>
                          <TableCell align="right">Last Production Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summaryRows.map((row) => (
                          <TableRow key={row.batchNumber} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{row.batchNumber}</TableCell>
                            <TableCell align="right">{formatNumber(row.initialBatchQuantity)}</TableCell>
                            <TableCell align="right">{formatNumber(row.dumpRejections)}</TableCell>
                            <TableCell align="right">{formatNumber(row.matrixInput)}</TableCell>
                            <TableCell align="right">{formatNumber(row.matrixRejections)}</TableCell>
                            <TableCell align="right">{formatNumber(row.pouchOutput)}</TableCell>
                            <TableCell align="right">{formatQcValue(row.qcConsumed, row.qcPending)}</TableCell>
                            <TableCell align="right">{formatQcValue(row.qcRetained, row.qcPending)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 500 }}>
                              {qcStatusLabel(row)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontWeight: row.dispatchQuantity === null ? 400 : 600, fontStyle: row.dispatchQuantity === null ? "italic" : "normal" }}
                            >
                              {formatDispatch(row)}
                            </TableCell>
                            <TableCell align="right">{row.latestProductionDate ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              )}
            </>
          )}

          {activeTab === "create" && (
            <Stack spacing={3}>
              <Typography variant="subtitle1">New Dispatch</Typography>
              <TextField label="Dispatch ID" placeholder="Enter unique dispatch reference" fullWidth />
              <TextField label="Destination" placeholder="Enter destination location" fullWidth />
              <TextField label="Courier Partner" placeholder="Enter courier/logistics partner" fullWidth />
              <TextField label="Remarks" placeholder="Add any additional notes" multiline rows={3} fullWidth />
              <Box>
                <Button variant="contained" disabled>
                  Save Dispatch (Coming Soon)
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default DispatchDetailsPage;
