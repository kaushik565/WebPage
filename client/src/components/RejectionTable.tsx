import {
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { format, parseISO } from "date-fns";
import type { RejectionEntry } from "../api.ts";

type Props = {
  entries: RejectionEntry[];
  loading: boolean;
  error: boolean;
};

function RejectionTable({ entries, loading, error }: Props) {
  const toDisplayDate = (value: string) => {
    try {
      return format(parseISO(value), "dd/MM/yyyy");
    } catch {
      const fallback = new Date(value);
      return Number.isNaN(fallback.getTime()) ? value : format(fallback, "dd/MM/yyyy");
    }
  };

  if (loading) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: "center",
          borderRadius: 4,
          border: "1px dashed rgba(0,85,165,0.3)"
        }}
      >
        <CircularProgress size={28} />
      </Paper>
    );
  }

  if (error) {
    return <Alert severity="error">Could not load entries.</Alert>;
  }

  if (!entries.length) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: "center",
          borderRadius: 4,
          border: "1px dashed rgba(148, 163, 184, 0.4)"
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No entries yet. Your recent submissions will show here.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 4,
        border: "1px solid rgba(148, 163, 184, 0.2)"
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Shift</TableCell>
            <TableCell>Batch</TableCell>
            <TableCell>Line</TableCell>
            <TableCell>Stage</TableCell>
            <TableCell>Equipment</TableCell>
            <TableCell>Rejection Type</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell>Updated By</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={entry.id}
              hover
              sx={{
                "&:last-of-type td, &:last-of-type th": { borderBottom: 0 }
              }}
            >
              <TableCell>{toDisplayDate(entry.entryDate)}</TableCell>
              <TableCell>{entry.shift}</TableCell>
              <TableCell>{entry.batchNo}</TableCell>
              <TableCell>{entry.line}</TableCell>
              <TableCell>{entry.stage}</TableCell>
              <TableCell>{entry.equipmentId}</TableCell>
              <TableCell>{entry.rejectionType}</TableCell>
              <TableCell align="right">{entry.quantity}</TableCell>
              <TableCell>{entry.updatedBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default RejectionTable;
