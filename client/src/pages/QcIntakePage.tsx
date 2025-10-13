import { useEffect, useMemo, useState } from "react";
import Grid from "@mui/material/Unstable_Grid2";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Paper,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import {
  fetchBatchClosures,
  updateMatrixQcSummary,
  type BatchClosure,
  type MatrixStageData
} from "../api.ts";
import { aggregateClosuresByBatch, hasQcDetails, type AggregatedFlowRow } from "../utils/closureFlow.ts";

const numberOrZero = (value: unknown) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

type MetricCardProps = {
  label: string;
  value?: number;
  pending?: boolean;
};

function MetricCard({ label, value, pending = false }: MetricCardProps) {
  const displayValue = pending
    ? "Pending QC"
    : typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "-";

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 0.5
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{ fontWeight: pending ? 500 : 600, fontStyle: pending ? "italic" : "normal", whiteSpace: "nowrap" }}
      >
        {displayValue}
      </Typography>
    </Paper>
  );
}

type QcFormValues = {
  qcConsumed: number;
  qcRetained: number;
};

function QcIntakePage() {
  const queryClient = useQueryClient();
  const {
    data: closures,
    isLoading,
    isError
  } = useQuery<BatchClosure[]>({
    queryKey: ["batch-closures"],
    queryFn: fetchBatchClosures
  });

  const matrixClosures = useMemo(
    () => (closures ?? []).filter((closure) => closure.stageType === "MatrixToPouch"),
    [closures]
  );

  const pendingMatrixClosures = useMemo(() => {
    return matrixClosures
      .filter((closure) => {
        const stageData = (closure.stageData ?? null) as any;
        const qcSummary = stageData?.qcSummary ?? null;
        const flowSummary = closure.flowSummary ?? null;
        return !hasQcDetails(qcSummary ?? flowSummary ?? null);
      })
      .slice()
      .sort((a, b) => {
        const left = a.productionDate ?? "";
        const right = b.productionDate ?? "";
        if (left === right) {
          const leftLot = a.lotNumber ?? Number.MAX_SAFE_INTEGER;
          const rightLot = b.lotNumber ?? Number.MAX_SAFE_INTEGER;
          return leftLot - rightLot;
        }
        return right.localeCompare(left);
      });
  }, [matrixClosures]);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (pendingMatrixClosures.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !pendingMatrixClosures.some((closure) => closure.id === selectedId)) {
      setSelectedId(pendingMatrixClosures[0]?.id ?? null);
    }
  }, [pendingMatrixClosures, selectedId]);

  const selectedClosure = useMemo(
    () => pendingMatrixClosures.find((closure) => closure.id === selectedId) ?? null,
    [pendingMatrixClosures, selectedId]
  );

  const aggregatedRows = useMemo<AggregatedFlowRow[]>(
    () => (closures && closures.length ? aggregateClosuresByBatch(closures) : []),
    [closures]
  );

  const selectedBatchSummary = useMemo(
    () =>
      selectedClosure
        ? aggregatedRows.find((row) => row.batchNumber === selectedClosure.batchNumber) ?? null
        : null,
    [aggregatedRows, selectedClosure]
  );

  const selectedStageData = useMemo<MatrixStageData | null>(
    () => (selectedClosure?.stageData ?? null) as MatrixStageData | null,
    [selectedClosure]
  );

  const form = useForm<QcFormValues>({
    defaultValues: {
      qcConsumed: 0,
      qcRetained: 0
    }
  });

  useEffect(() => {
    if (!selectedClosure) {
      form.reset({ qcConsumed: 0, qcRetained: 0 });
      return;
    }
    const qcSummary = (selectedClosure.stageData as any)?.qcSummary ?? selectedClosure.flowSummary ?? {};
    form.reset({
      qcConsumed: numberOrZero(qcSummary.qcConsumed),
      qcRetained: numberOrZero(qcSummary.qcRetained)
    });
  }, [selectedClosure, form]);

  const mutation = useMutation({
    mutationFn: async ({ id, values, totalOutput }: { id: number; values: QcFormValues; totalOutput: number }) => {
      const payload = {
        qcConsumed: Number(values.qcConsumed) || 0,
        qcRetained: Number(values.qcRetained) || 0,
        totalOutput
      };
      return updateMatrixQcSummary(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-closures"] });
    }
  });

  const watchedValues = form.watch();

  const computedDispatch = useMemo(() => {
    if (!selectedClosure) {
      return 0;
    }
    const values = watchedValues;
    const totalOutput = numberOrZero(
      (selectedClosure.stageData as any)?.totals?.totalOutput ?? selectedClosure.totalAnnealing
    );
    return Math.max(totalOutput - numberOrZero(values.qcConsumed) - numberOrZero(values.qcRetained), 0);
  }, [selectedClosure, watchedValues]);

  const rejectionStages = selectedStageData?.rejectionStages ?? null;
  const stageTotals = selectedStageData?.totals ?? {};
  const detailRows = selectedStageData?.detailRows ?? [];
  const detailRowSums = useMemo(
    () =>
      detailRows.reduce(
        (acc, row) => ({
          vi02: acc.vi02 + numberOrZero(row.vi02),
          vi03: acc.vi03 + numberOrZero(row.vi03),
          vacuum: acc.vacuum + numberOrZero(row.vacuum),
          vi04: acc.vi04 + numberOrZero(row.vi04),
          vi04Rework: acc.vi04Rework + numberOrZero(row.vi04Rework),
          rejection: acc.rejection + numberOrZero(row.rejection),
          yieldPercent: acc.yieldPercent + Number(row.yieldPercent ?? 0)
        }),
        { vi02: 0, vi03: 0, vacuum: 0, vi04: 0, vi04Rework: 0, rejection: 0, yieldPercent: 0 }
      ),
    [detailRows]
  );
  const averageYield = detailRows.length ? detailRowSums.yieldPercent / detailRows.length : 0;

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          QC Intake Workspace
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Record QC consumed and retained cartridges after pouch packing to finalise dispatch readiness.
        </Typography>
      </Box>

      <Card>
        <CardHeader title="Pending QC Lots" subheader="Fill QC consumed and retained to release batches for dispatch" />
        <Divider />
        <CardContent>
          {isLoading ? (
            <Stack alignItems="center" justifyContent="center" py={4}>
              <CircularProgress />
            </Stack>
          ) : null}
          {!isLoading && isError ? (
            <Alert severity="error">Unable to load batch closures. Please try again.</Alert>
          ) : null}
          {!isLoading && !isError && pendingMatrixClosures.length === 0 ? (
            matrixClosures.length === 0 ? (
              <Alert severity="info">
                Matrix closures not yet recorded. QC intake will appear once QA submits matrix data.
              </Alert>
            ) : (
              <Alert severity="success">All submitted matrix lots have QC details recorded.</Alert>
            )
          ) : null}

          {!isLoading && !isError && pendingMatrixClosures.length > 0 ? (
            <Grid container spacing={3}>
              <Grid xs={12} md={4}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Select Lot
                  </Typography>
                  <Stack spacing={1.5}>
                    {pendingMatrixClosures.map((closure) => {
                      const lotLabel = closure.lotLabel ?? `Lot ${closure.lotNumber ?? ""}`;
                      return (
                        <Button
                          key={closure.id}
                          variant={closure.id === selectedId ? "contained" : "outlined"}
                          onClick={() => setSelectedId(closure.id)}
                          sx={{ justifyContent: "space-between" }}
                        >
                          <span>
                            {closure.batchNumber}
                            <Typography component="span" variant="body2" sx={{ ml: 1, opacity: 0.7 }}>
                              {lotLabel}
                            </Typography>
                          </span>
                          <Typography component="span" variant="caption">
                            {closure.productionDate ?? "-"}
                          </Typography>
                        </Button>
                      );
                    })}
                  </Stack>
                </Stack>
              </Grid>

              <Grid xs={12} md={8}>
                {selectedClosure ? (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {selectedClosure.batchNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Lot {selectedClosure.lotLabel ?? selectedClosure.lotNumber ?? "-"} · Line {selectedClosure.line}
                      </Typography>
                    </Box>

                    {selectedBatchSummary ? (
                      <Stack spacing={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Batch Flow Snapshot
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid xs={12} md={4}>
                            <MetricCard label="Initial Batch" value={selectedBatchSummary.initialBatchQuantity} />
                          </Grid>
                          <Grid xs={12} md={4}>
                            <MetricCard label="Dump Rejections" value={selectedBatchSummary.dumpRejections} />
                          </Grid>
                          <Grid xs={12} md={4}>
                            <MetricCard label="To Matrix" value={selectedBatchSummary.matrixInput} />
                          </Grid>
                          <Grid xs={12} md={4}>
                            <MetricCard label="Matrix Rejections" value={selectedBatchSummary.matrixRejections} />
                          </Grid>
                          <Grid xs={12} md={4}>
                            <MetricCard label="Pouch Output" value={selectedBatchSummary.pouchOutput} />
                          </Grid>
                          <Grid xs={12} md={4}>
                            <MetricCard
                              label="Dispatch Quantity"
                              value={selectedBatchSummary.dispatchQuantity ?? undefined}
                              pending={selectedBatchSummary.qcPending}
                            />
                          </Grid>
                        </Grid>
                      </Stack>
                    ) : null}

                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Pouch Output
                        </Typography>
                        <Typography variant="h6">
                          {numberOrZero(
                            (selectedClosure.stageData as any)?.totals?.totalOutput ?? selectedClosure.totalAnnealing
                          ).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Matrix Rejections
                        </Typography>
                        <Typography variant="h6">
                          {numberOrZero(
                            (selectedClosure.stageData as any)?.totals?.totalRejections ?? selectedClosure.totalRejections
                          ).toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>

                    {rejectionStages ? (
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Visual Inspection Rejections
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid xs={6} md={4}>
                            <MetricCard label="VI-2" value={numberOrZero(rejectionStages.vi2)} />
                          </Grid>
                          <Grid xs={6} md={4}>
                            <MetricCard label="VI-3" value={numberOrZero(rejectionStages.vi3)} />
                          </Grid>
                          <Grid xs={6} md={4}>
                            <MetricCard label="Vacuum" value={numberOrZero(rejectionStages.vacuum)} />
                          </Grid>
                          <Grid xs={6} md={4}>
                            <MetricCard label="VI-4" value={numberOrZero(rejectionStages.vi4)} />
                          </Grid>
                          <Grid xs={6} md={4}>
                            <MetricCard label="VI-4 Rework" value={numberOrZero(rejectionStages.vi4Rework)} />
                          </Grid>
                        </Grid>
                      </Stack>
                    ) : null}

                    <Stack spacing={1.5}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Shift Breakdown
                      </Typography>
                      {detailRows.length > 0 ? (
                        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Accepted</TableCell>
                                <TableCell align="right">VI-02</TableCell>
                                <TableCell align="right">VI-03</TableCell>
                                <TableCell align="right">Vacuum</TableCell>
                                <TableCell align="right">VI-04</TableCell>
                                <TableCell align="right">VI-04 Rework</TableCell>
                                <TableCell align="right">Rejections</TableCell>
                                <TableCell align="right">Output</TableCell>
                                <TableCell align="right">Yield %</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {detailRows.map((row, index) => (
                                <TableRow key={index} hover>
                                  <TableCell>{numberOrZero(row.totalAccepted).toLocaleString()}</TableCell>
                                  <TableCell align="right">{numberOrZero(row.vi02).toLocaleString()}</TableCell>
                                  <TableCell align="right">{numberOrZero(row.vi03).toLocaleString()}</TableCell>
                                  <TableCell align="right">{numberOrZero(row.vacuum).toLocaleString()}</TableCell>
                                  <TableCell align="right">{numberOrZero(row.vi04).toLocaleString()}</TableCell>
                                  <TableCell align="right">{numberOrZero(row.vi04Rework).toLocaleString()}</TableCell>
                                  <TableCell align="right">{numberOrZero(row.rejection).toLocaleString()}</TableCell>
                                  <TableCell align="right">{numberOrZero(row.output).toLocaleString()}</TableCell>
                                  <TableCell align="right">{Number(row.yieldPercent ?? 0).toFixed(2)}%</TableCell>
                                </TableRow>
                              ))}
                              <TableRow selected>
                                <TableCell sx={{ fontWeight: 600 }}>
                                  {numberOrZero(stageTotals.totalAccepted).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {numberOrZero(detailRowSums.vi02).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {numberOrZero(detailRowSums.vi03).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {numberOrZero(detailRowSums.vacuum).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {numberOrZero(detailRowSums.vi04).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {numberOrZero(detailRowSums.vi04Rework).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {numberOrZero(detailRowSums.rejection).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {numberOrZero(stageTotals.totalOutput).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {averageYield.toFixed(2)}
                                  %
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Alert severity="info">No detailed shift data recorded for this lot.</Alert>
                      )}
                    </Stack>

                    <Stack
                      spacing={2}
                      component="form"
                      onSubmit={form.handleSubmit((values) => {
                        if (!selectedClosure) return;
                        const totalOutput = numberOrZero(
                          (selectedClosure.stageData as any)?.totals?.totalOutput ?? selectedClosure.totalAnnealing
                        );
                        mutation.mutate({ id: selectedClosure.id, values, totalOutput });
                      })}
                    >
                      <Controller
                        name="qcConsumed"
                        control={form.control}
                        rules={{ min: { value: 0, message: "Cannot be negative" } }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            type="number"
                            label="QC Consumed"
                            inputProps={{ min: 0 }}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                      <Controller
                        name="qcRetained"
                        control={form.control}
                        rules={{ min: { value: 0, message: "Cannot be negative" } }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            type="number"
                            label="QC Retained"
                            inputProps={{ min: 0 }}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                      <TextField
                        label="Dispatch Quantity (calculated)"
                        value={computedDispatch.toLocaleString()}
                        InputProps={{ readOnly: true }}
                        helperText="Pouch Output - QC Consumed - QC Retained"
                      />
                      <Box>
                        <Button type="submit" variant="contained" disabled={mutation.isPending}>
                          {mutation.isPending ? "Saving..." : "Save QC Summary"}
                        </Button>
                      </Box>
                    </Stack>
                  </Stack>
                ) : (
                  <Alert severity="info">Select a lot to record QC details.</Alert>
                )}
              </Grid>
            </Grid>
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default QcIntakePage;
