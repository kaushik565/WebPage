import Grid from "@mui/material/Unstable_Grid2";
import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import type { BatchClosure, BatchClosureDetailRow, ComponentTotals } from "../api.ts";

type Props = {
  closure: BatchClosure;
  disablePaper?: boolean;
};

const DumpClosureView = ({ closure, disablePaper = false }: Props) => {
  const lotTitle = closure.lotLabel ? `Lot ${closure.lotLabel}` : `Lot ${closure.lotNumber ?? ""}`;
  const componentSummary = (closure.componentSummary ?? null) as
    | { filterRod?: ComponentTotals; dump2?: ComponentTotals; sampleFilter?: ComponentTotals }
    | null;
  const detailRows = (closure.detailRows ?? []) as BatchClosureDetailRow[];
  const detailTotals = closure.detailTotals ?? null;

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
          <Typography variant="subtitle1">{closure.line ?? "-"}</Typography>
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
            Total Annealing
          </Typography>
          <Typography variant="subtitle1">{closure.totalAnnealing ?? 0}</Typography>
        </Grid>
        <Grid xs={12} md={4}>
          <Typography variant="body2" color="text.secondary">
            Total Rejections
          </Typography>
          <Typography variant="subtitle1">{closure.totalRejections ?? 0}</Typography>
        </Grid>
      </Grid>

      {componentSummary && (
        <Stack spacing={1}>
          <Typography variant="subtitle1">Material Details</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Material</TableCell>
                <TableCell align="right">Total Quantity</TableCell>
                <TableCell align="right">Leftover Quantity</TableCell>
                <TableCell align="right">Inline Child Parts Rejections</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(
                [
                  ["filterRod", "Filter Rod"],
                  ["dump2", "Dump 2"],
                  ["sampleFilter", "Sample Filter"]
                ] as const
              ).map(([key, label]) => {
                const data = componentSummary[key];
                if (!data) return null;
                return (
                  <TableRow key={key}>
                    <TableCell>{label}</TableCell>
                    <TableCell align="right">{data.totalQuantity ?? 0}</TableCell>
                    <TableCell align="right">{data.leftoverQuantity ?? 0}</TableCell>
                    <TableCell align="right">{data.inlineChildRejections ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Stack>
      )}

      <Stack spacing={1}>
        <Typography variant="subtitle1">Dump Insertion Details</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Dump Insertion</TableCell>
              <TableCell align="right">Accepted / Output</TableCell>
              <TableCell align="right">Rejections</TableCell>
              <TableCell align="right">Annealing</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detailRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No entries recorded.
                </TableCell>
              </TableRow>
            )}
            {detailRows.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.dumpInsertion ?? 0}</TableCell>
                <TableCell align="right">{row.acceptedOutput ?? 0}</TableCell>
                <TableCell align="right">{row.rejections ?? 0}</TableCell>
                <TableCell align="right">{row.annealing ?? 0}</TableCell>
              </TableRow>
            ))}
            {detailTotals && (
              <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                <TableCell>
                  <strong>{detailTotals.dumpInsertion ?? 0}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{detailTotals.acceptedOutput ?? 0}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{detailTotals.rejections ?? 0}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{detailTotals.annealing ?? 0}</strong>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Stack>

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

export default DumpClosureView;
