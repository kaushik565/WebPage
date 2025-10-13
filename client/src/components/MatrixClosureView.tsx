import Grid from "@mui/material/Unstable_Grid2";
import {
  Alert,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import type { BatchClosure, MatrixDetailRow, MatrixStageData } from "../api.ts";

type Props = {
  closure: BatchClosure;
  disablePaper?: boolean;
};

const MatrixClosureView = ({ closure, disablePaper = false }: Props) => {
  const lotTitle = closure.lotLabel ? `Lot ${closure.lotLabel}` : `Lot ${closure.lotNumber ?? ""}`;
  const stageData = (closure.stageData ?? null) as MatrixStageData | null;
  const detailRows = (stageData?.detailRows ?? []) as MatrixDetailRow[];
  const flowSummary = closure.flowSummary ?? null;
  const detailAggregate = detailRows.reduce(
    (acc, row) => ({
      totalAccepted: acc.totalAccepted + Number(row.totalAccepted || 0),
      vi02: acc.vi02 + Number(row.vi02 || 0),
      vi03: acc.vi03 + Number(row.vi03 || 0),
      vacuum: acc.vacuum + Number(row.vacuum || 0),
      vi04: acc.vi04 + Number(row.vi04 || 0),
      vi4Rework: acc.vi4Rework + Number(row.vi04Rework || 0),
      rejection: acc.rejection + Number(row.rejection || 0),
      output: acc.output + Number(row.output || 0)
    }),
    {
      totalAccepted: 0,
      vi02: 0,
      vi03: 0,
      vacuum: 0,
      vi04: 0,
      vi4Rework: 0,
      rejection: 0,
      output: 0
    }
  );
  const averageYield =
    detailRows.length > 0
      ? Math.round(
          detailRows.reduce((sum, row) => sum + Number(row.yieldPercent || 0), 0) /
            detailRows.length
        )
      : 0;
  const totalOutputValue = Number(
    stageData?.totals?.totalOutput ?? flowSummary?.pouchOutput ?? closure.totalAnnealing ?? 0
  );
  const qcConsumed = Number(
    flowSummary?.qcConsumed ?? stageData?.qcSummary?.qcConsumed ?? 0
  );
  const qcRetained = Number(
    flowSummary?.qcRetained ?? stageData?.qcSummary?.qcRetained ?? 0
  );
  const qcDispatch =
    flowSummary?.dispatchQuantity ??
    stageData?.qcSummary?.dispatchQuantity ??
    Math.max(totalOutputValue - qcConsumed - qcRetained, 0);
  const qcInput = stageData?.qcSummary?.totalOutputForQc ?? totalOutputValue;
  const hasQcRecord = Boolean(
    stageData?.qcSummary || flowSummary?.qcConsumed !== undefined || flowSummary?.qcRetained !== undefined
  );

  const content = (
    <Stack spacing={3}>
        <Typography variant="h6">{lotTitle}</Typography>

        <Grid container spacing={2.5}>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Production Date
            </Typography>
            <Typography variant="subtitle1">{closure.productionDate ?? "-"}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Shift
            </Typography>
            <Typography variant="subtitle1">{closure.shift ?? "-"}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Line
            </Typography>
            <Typography variant="subtitle1">{closure.line ?? stageData?.line ?? "-"}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Closure Given By
            </Typography>
            <Typography variant="subtitle1">{closure.closureGivenBy ?? "-"}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Total Accepted
            </Typography>
            <Typography variant="subtitle1">{closure.totalAccepted ?? 0}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Total Output
            </Typography>
            <Typography variant="subtitle1">{closure.totalAnnealing ?? 0}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Total Rejections
            </Typography>
            <Typography variant="subtitle1">{closure.totalRejections ?? 0}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Status
            </Typography>
            <Typography variant="subtitle1">{closure.status ?? "-"}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Line Clearance
            </Typography>
            <Typography variant="subtitle1">{closure.lineClearanceDateTime ?? "-"}</Typography>
          </Grid>
          <Grid xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Line Closure Time
            </Typography>
            <Typography variant="subtitle1">{closure.lineClosureTime ?? "-"}</Typography>
          </Grid>
        </Grid>

        {!stageData && (
          <Alert severity="info">No matrix stage details recorded for this lot.</Alert>
        )}

        {stageData && (
          <Stack spacing={3}>
            <Grid container spacing={2.5}>
              <Grid xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Line
                </Typography>
                <Typography variant="subtitle1">{stageData.line ?? "-"}</Typography>
              </Grid>
              <Grid xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Cartridge Type
                </Typography>
                <Typography variant="subtitle1">{stageData.cartridgeType ?? "-"}</Typography>
              </Grid>
            </Grid>

            <Stack spacing={1}>
              <Typography variant="subtitle1">Material Totals</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">Total Quantity</TableCell>
                    <TableCell align="right">Leftover Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(
                    [
                      ["matrix", "Matrix"],
                      ["rightValveCap", "Right Valve Cap"],
                      ["assembledSmiley", "Assembled Smiley"],
                      ["leftValveCap", "Left Valve Cap"],
                      ["bufferCap", "Buffer Cap"]
                    ] as const
                  ).map(([key, label]) => {
                    const data = stageData.materialTotals[key];
                    if (!data) return null;
                    return (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell align="right">{data.totalQuantity ?? 0}</TableCell>
                        <TableCell align="right">{data.leftoverQuantity ?? 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1">Inline Child Parts</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(
                    [
                      ["matrix", "Matrix"],
                      ["assembledSmiley", "Assembled Smiley"],
                      ["leftValveCap", "Left Valve Cap"],
                      ["rightValveCap", "Right Valve Cap"],
                      ["bufferCap", "Buffer Cap"]
                    ] as const
                  ).map(([key, label]) => {
                    const value = stageData.inlineChildParts[key];
                    if (typeof value !== "number") return null;
                    return (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell align="right">{value}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Stack>

            {stageData.auxiliaryTotals && (
              <Stack spacing={1}>
                <Typography variant="subtitle1">Auxiliary Totals</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell align="right">Total Quantity</TableCell>
                      <TableCell align="right">Leftover Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(
                      [
                        ["aluminumFoil", "Aluminum Foil"],
                        ["flurosiliconOil", "Flurosilicon Oil"]
                      ] as const
                    ).map(([key, label]) => {
                      const data = stageData.auxiliaryTotals?.[key];
                      if (!data) return null;
                      return (
                        <TableRow key={key}>
                          <TableCell>{label}</TableCell>
                          <TableCell align="right">{data.totalQuantity ?? 0}</TableCell>
                          <TableCell align="right">{data.leftoverQuantity ?? 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Stack>
            )}

            <Stack spacing={1}>
              <Typography variant="subtitle1">Stage Flow Summary</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Matrix Input</TableCell>
                    <TableCell align="right">
                      {Number(flowSummary?.matrixInput ?? stageData?.totals?.matrixInput ?? closure.batchQuantity ?? 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Matrix Rejections</TableCell>
                    <TableCell align="right">
                      {Number(flowSummary?.matrixRejections ?? stageData?.totals?.totalRejections ?? closure.totalRejections ?? 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pouch Output</TableCell>
                    <TableCell align="right">{totalOutputValue}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Dispatch Ready</TableCell>
                    <TableCell align="right">{qcDispatch}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1">Rejection Stages</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Stage</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(
                    [
                      ["vi2", "VI-2"],
                      ["vi3", "VI-3"],
                      ["vacuum", "Vacuum"],
                      ["vi4", "VI-4"],
                      ["vi4Rework", "VI-4 Rework"]
                    ] as const
                  ).map(([key, label]) => {
                    const value = stageData.rejectionStages[key];
                    if (typeof value !== "number") return null;
                    return (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell align="right">{value}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1">QC Summary</Typography>
              {hasQcRecord ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Output to QC</TableCell>
                      <TableCell align="right">{qcInput}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>QC Consumed</TableCell>
                      <TableCell align="right">{qcConsumed}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>QC Retained</TableCell>
                      <TableCell align="right">{qcRetained}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dispatch Quantity</TableCell>
                      <TableCell align="right">{qcDispatch}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <Alert severity="info">QC team has not updated consumed/retained counts for this lot yet.</Alert>
              )}
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1">Yield Detail</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Total Accepted</TableCell>
                    <TableCell align="right">VI-02</TableCell>
                    <TableCell align="right">VI-03</TableCell>
                    <TableCell align="right">Vacuum</TableCell>
                    <TableCell align="right">VI-04</TableCell>
                    <TableCell align="right">VI-04 Rework</TableCell>
                    <TableCell align="right">Rejection</TableCell>
                    <TableCell align="right">Output</TableCell>
                    <TableCell align="right">Yield %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No yield rows recorded.
                      </TableCell>
                    </TableRow>
                  )}
                  {detailRows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.totalAccepted ?? 0}</TableCell>
                      <TableCell align="right">{row.vi02 ?? 0}</TableCell>
                      <TableCell align="right">{row.vi03 ?? 0}</TableCell>
                      <TableCell align="right">{row.vacuum ?? 0}</TableCell>
                      <TableCell align="right">{row.vi04 ?? 0}</TableCell>
                      <TableCell align="right">{row.vi04Rework ?? 0}</TableCell>
                      <TableCell align="right">{row.rejection ?? 0}</TableCell>
                      <TableCell align="right">{row.output ?? 0}</TableCell>
                      <TableCell align="right">{row.yieldPercent ?? 0}</TableCell>
                    </TableRow>
                  ))}
                  {detailRows.length > 0 && (
                    <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                      <TableCell>
                        <strong>{detailAggregate.totalAccepted}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailAggregate.vi02}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailAggregate.vi03}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailAggregate.vacuum}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailAggregate.vi04}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailAggregate.vi4Rework}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailAggregate.rejection}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailAggregate.output}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{averageYield}</strong>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Stack>
          </Stack>
        )}

        {closure.remarks && (
          <Stack spacing={1}>
            <Typography variant="subtitle1">Remarks</Typography>
            <Typography variant="body2">{closure.remarks}</Typography>
          </Stack>
        )}
    </Stack>
  );

  if (disablePaper) {
    return content;
  }

  return <Paper sx={{ p: 3 }}>{content}</Paper>;
};

export default MatrixClosureView;
