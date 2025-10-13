import { useState } from "react";
import Grid from "@mui/material/Unstable_Grid2";
import { Alert, Box, Chip, CircularProgress, Divider, Snackbar, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import RejectionForm from "../components/RejectionForm.tsx";
import RejectionTable from "../components/RejectionTable.tsx";
import ExcelUploadCard from "../components/ExcelUploadCard.tsx";
import { fetchRejections } from "../api.ts";
import { useLookups } from "../hooks/useLookups.ts";

function RejectionFormPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { data: lookups, isLoading: lookupsLoading, isError: lookupsError } = useLookups();

  const {
    data: rejectionEntries,
    isLoading: rejectionLoading,
    isError: rejectionError
  } = useQuery({
    queryKey: ["rejections"],
    queryFn: fetchRejections,
    enabled: !!lookups
  });

  if (lookupsLoading) {
    return (
      <Stack alignItems="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  if (lookupsError || !lookups) {
    return <Alert severity="error">Failed to load lookup data.</Alert>;
  }

  return (
    <>
      <Stack spacing={5}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
              Rejection Capture
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={600}>
              Log every rejection for the selected batch and line. Add multiple stages before submitting to
              keep your data clean and precise.
            </Typography>
          </Box>
          <Chip
            label={`Total rejections today: ${
              (rejectionEntries ?? []).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
            }`}
            color="secondary"
            variant="outlined"
            sx={{ fontWeight: 600, px: 1 }}
          />
        </Box>

        <Grid container spacing={4}>
          <Grid xs={12} lg={7}>
            <RejectionForm
              lookups={lookups}
              onSubmitted={() => setToastMessage("Rejection entries saved successfully.")}
            />
          </Grid>
          <Grid xs={12} lg={5}>
            <Stack spacing={3}>
              <Stack spacing={2}>
                <Typography variant="h6">Recent Entries</Typography>
                <RejectionTable
                  entries={(rejectionEntries ?? []).slice(0, 5)}
                  loading={rejectionLoading}
                  error={rejectionError}
                />
              </Stack>
              <ExcelUploadCard
                onUploadComplete={() => setToastMessage("Excel upload processed successfully.")}
              />
            </Stack>
          </Grid>
        </Grid>
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

export default RejectionFormPage;
