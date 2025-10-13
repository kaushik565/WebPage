import { useEffect, useMemo, useState } from "react";
import Grid from "@mui/material/Unstable_Grid2";
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
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
import DumpClosureForm from "../components/BatchClosureForm.tsx";
import MatrixClosureForm from "../components/MatrixClosureForm.tsx";
import DumpClosureView from "../components/DumpClosureView.tsx";
import MatrixClosureView from "../components/MatrixClosureView.tsx";
import { fetchBatchClosures } from "../api.ts";
import type { BatchClosure } from "../api.ts";

type CartridgeType = "NC" | "L" | "LR" | "UNKNOWN";

type BatchInfo = {
  batchNumber: string;
  line: string;
  cartridgeType: CartridgeType;
  serial: string;
};

const parseBatchNumber = (value: string): BatchInfo | null => {
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(trimmed)) {
    return null;
  }

  const digitIndex = trimmed.search(/\d/);
  if (digitIndex < 0) {
    return null;
  }

  const prefix = trimmed.slice(0, digitIndex);
  if (prefix.length < 3) {
    return null;
  }

  const line = trimmed[2];
  const validLines = ["A", "B", "C", "D", "E", "F", "G"];
  if (!validLines.includes(line)) {
    return null;
  }

  const digitsPart = trimmed.slice(digitIndex);
  if (!digitsPart) {
    return null;
  }
  const typeCode = prefix.slice(3);

  let cartridgeType: CartridgeType;
  switch (typeCode) {
    case "NC":
      cartridgeType = "NC";
      break;
    case "L":
      cartridgeType = "L";
      break;
    case "LR":
      cartridgeType = "LR";
      break;
    default:
      cartridgeType = "UNKNOWN";
  }

  return {
    batchNumber: trimmed,
    line,
    cartridgeType,
    serial: digitsPart
  };
};

function BatchClosurePage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [batchInput, setBatchInput] = useState("");
  const [batchError, setBatchError] = useState("");
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [selectedStage, setSelectedStage] = useState<"dump" | "matrix">("dump");
  const [lotCounters, setLotCounters] = useState({ dump: 1, matrix: 1 });
  const [selectedDumpLot, setSelectedDumpLot] = useState<BatchClosure | null>(null);
  const [selectedMatrixLot, setSelectedMatrixLot] = useState<BatchClosure | null>(null);
  const {
    data: batchClosures,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["batch-closures"],
    queryFn: fetchBatchClosures
  });

  const closuresForBatch = useMemo(() => {
    if (!batchInfo) {
      return [] as BatchClosure[];
    }
    return (batchClosures ?? []).filter((closure) => closure.batchNumber === batchInfo.batchNumber);
  }, [batchInfo, batchClosures]);

  const dumpLots = useMemo(
    () =>
      closuresForBatch
        .filter((closure) => closure.stageType === "DumpToAnnealing")
        .sort((a, b) => (a.lotNumber ?? 0) - (b.lotNumber ?? 0)),
    [closuresForBatch]
  );

  const matrixLots = useMemo(
    () =>
      closuresForBatch
        .filter((closure) => closure.stageType === "MatrixToPouch")
        .sort((a, b) => (a.lotNumber ?? 0) - (b.lotNumber ?? 0)),
    [closuresForBatch]
  );

  useEffect(() => {
    if (!batchInfo) {
      setLotCounters({ dump: 1, matrix: 1 });
      setSelectedDumpLot(null);
      setSelectedMatrixLot(null);
      return;
    }

    const dumpMax = dumpLots.reduce((max, closure) => Math.max(max, closure.lotNumber ?? 0), 0);
    const matrixMax = matrixLots.reduce((max, closure) => Math.max(max, closure.lotNumber ?? 0), 0);

    const desired = {
      dump: dumpMax > 0 ? dumpMax + 1 : 1,
      matrix: matrixMax > 0 ? matrixMax + 1 : 1
    };

    setLotCounters((prev) =>
      prev.dump === desired.dump && prev.matrix === desired.matrix ? prev : desired
    );

    setSelectedDumpLot((prev) =>
      prev && !dumpLots.some((lot) => lot.id === prev.id) ? null : prev
    );
    setSelectedMatrixLot((prev) =>
      prev && !matrixLots.some((lot) => lot.id === prev.id) ? null : prev
    );
  }, [batchInfo, dumpLots, matrixLots]);

  const handleAddLot = (stage: "dump" | "matrix") => {
    if (!batchInfo) return;
    if (stage === "dump") {
      setSelectedStage("dump");
      setSelectedDumpLot(null);
      const next = (dumpLots[dumpLots.length - 1]?.lotNumber ?? 0) + 1;
      setLotCounters((prev) => ({ ...prev, dump: Math.max(prev.dump, next) }));
    } else {
      setSelectedStage("matrix");
      setSelectedMatrixLot(null);
      const next = (matrixLots[matrixLots.length - 1]?.lotNumber ?? 0) + 1;
      setLotCounters((prev) => ({ ...prev, matrix: Math.max(prev.matrix, next) }));
    }
    setToastMessage(null);
  };

  const handleDumpSaved = () => {
    setToastMessage("Dump closure saved successfully.");
    setSelectedDumpLot(null);
    setLotCounters((prev) => ({ ...prev, dump: prev.dump + 1 }));
  };

  const handleMatrixSaved = () => {
    setToastMessage("Matrix closure saved successfully.");
    setSelectedMatrixLot(null);
    setLotCounters((prev) => ({ ...prev, matrix: prev.matrix + 1 }));
  };

  return (
    <>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Batch Closure Workspace
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Maintain closure records for Dump Insertion → Annealing and Matrix Pallet Filling → Pouch Packing.
          </Typography>
        </Stack>

        <Paper sx={{ p: 3 }}>
          {batchInfo ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
              <Box>
                <Typography variant="subtitle1">Batch {batchInfo.batchNumber}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Line {batchInfo.line} · Cartridge {batchInfo.cartridgeType}
                </Typography>
                {batchInfo.cartridgeType === "UNKNOWN" && (
                  <Typography variant="body2" color="warning.main">
                    Cartridge type could not be determined from the batch number. All fields are visible.
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                onClick={() => {
                  setBatchInfo(null);
                  setBatchInput("");
                  setBatchError("");
                  setSelectedStage("dump");
                  setLotCounters({ dump: 1, matrix: 1 });
                  setSelectedDumpLot(null);
                  setSelectedMatrixLot(null);
                  setToastMessage(null);
                }}
              >
                Change Batch
              </Button>
            </Stack>
          ) : (
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                const parsed = parseBatchNumber(batchInput);
                if (!parsed) {
                  setBatchError("Enter a valid 10-character batch number (e.g., MVANC00001).");
                  return;
                }
                setBatchInfo(parsed);
                setBatchError("");
                setSelectedStage("dump");
                setLotCounters({ dump: 1, matrix: 1 });
                setSelectedDumpLot(null);
                setSelectedMatrixLot(null);
                setToastMessage(null);
              }}
              sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
            >
              <TextField
                label="Batch Number"
                value={batchInput}
                onChange={(event) => {
                  setBatchInput(event.target.value.toUpperCase());
                  setBatchError("");
                }}
                inputProps={{ maxLength: 10 }}
                helperText="Example: MVANC00001"
                required
              />
              <Button type="submit" variant="contained">
                Load Layout
              </Button>
              {batchError && (
                <Typography variant="body2" color="error" sx={{ width: "100%" }}>
                  {batchError}
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        {batchInfo && (
          <Stack spacing={3}>
            <Tabs
              value={selectedStage}
              onChange={(_event, value) => setSelectedStage(value)}
              variant="fullWidth"
              sx={{ mb: 2, bgcolor: "rgba(15,23,42,0.04)", borderRadius: 3 }}
            >
              <Tab label="Dump → Annealing" value="dump" />
              <Tab label="Matrix → Pouch" value="matrix" />
            </Tabs>
            <Box>
              {selectedStage === "dump" && (
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} flexWrap="wrap">
                    <Button
                      variant={selectedDumpLot ? "outlined" : "contained"}
                      onClick={() => handleAddLot("dump")}
                    >
                      New Lot ({lotCounters.dump})
                    </Button>
                    {dumpLots.map((lot) => (
                      <Button
                        key={lot.id}
                        variant={selectedDumpLot?.id === lot.id ? "contained" : "outlined"}
                        onClick={() => {
                          setSelectedStage("dump");
                          setSelectedDumpLot(lot);
                        }}
                      >
                        {lot.lotLabel ?? `Lot ${lot.lotNumber ?? lot.id}`}
                      </Button>
                    ))}
                  </Stack>
                  {selectedDumpLot ? (
                    <DumpClosureView closure={selectedDumpLot} />
                  ) : (
                    <DumpClosureForm
                      key={`dump-${batchInfo.batchNumber}-${lotCounters.dump}`}
                      batchNumber={batchInfo.batchNumber}
                      line={batchInfo.line}
                      lotIndex={lotCounters.dump}
                      onSubmitted={handleDumpSaved}
                    />
                  )}
                </Stack>
              )}
              {selectedStage === "matrix" && (
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} flexWrap="wrap">
                    <Button
                      variant={selectedMatrixLot ? "outlined" : "contained"}
                      onClick={() => handleAddLot("matrix")}
                    >
                      New Lot ({lotCounters.matrix})
                    </Button>
                    {matrixLots.map((lot) => (
                      <Button
                        key={lot.id}
                        variant={selectedMatrixLot?.id === lot.id ? "contained" : "outlined"}
                        onClick={() => {
                          setSelectedStage("matrix");
                          setSelectedMatrixLot(lot);
                        }}
                      >
                        {lot.lotLabel ?? `Lot ${lot.lotNumber ?? lot.id}`}
                      </Button>
                    ))}
                  </Stack>
                  {selectedMatrixLot ? (
                    <MatrixClosureView closure={selectedMatrixLot} />
                  ) : (
                    <MatrixClosureForm
                      key={`matrix-${batchInfo.batchNumber}-${lotCounters.matrix}`}
                      batchNumber={batchInfo.batchNumber}
                      line={batchInfo.line}
                      cartridgeType={batchInfo.cartridgeType}
                      lotIndex={lotCounters.matrix}
                      onSubmitted={handleMatrixSaved}
                    />
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        )}

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Batch Closures
          </Typography>
          {isLoading && <Typography>Loading...</Typography>}
          {isError && <Alert severity="error">Unable to load closures.</Alert>}
          {!isLoading && !isError && batchClosures && batchClosures.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Shift</TableCell>
                    <TableCell>Lot</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell align="right">Accepted</TableCell>
                    <TableCell align="right">Rejections</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchClosures.slice(0, 10).map((closure) => (
                    <TableRow key={closure.id}>
                      <TableCell>{closure.productionDate}</TableCell>
                      <TableCell>{closure.shift}</TableCell>
                      <TableCell>{closure.lotLabel || closure.lotNumber || "-"}</TableCell>
                      <TableCell>
                        {closure.stageType === "DumpToAnnealing"
                          ? "Dump → Annealing"
                          : closure.stageType === "MatrixToPouch"
                          ? "Matrix → Pouch"
                          : closure.stageType}
                      </TableCell>
                      <TableCell align="right">{closure.totalAccepted ?? "-"}</TableCell>
                      <TableCell align="right">{closure.totalRejections ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}
          {!isLoading && !isError && (!batchClosures || batchClosures.length === 0) && (
            <Typography variant="body2" color="text.secondary">
              No batch closures recorded yet.
            </Typography>
          )}
        </Paper>
      </Stack>
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3000}
        onClose={() => setToastMessage(null)}
        message={toastMessage ?? ""}
      />
    </>
  );
}

export default BatchClosurePage;
