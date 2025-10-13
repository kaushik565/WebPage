import { useState, ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  List,
  ListItem,
  Stack,
  Typography
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadRejectionsExcel, UploadResponse } from "../api.ts";

type ExcelUploadCardProps = {
  onUploadComplete?: () => void;
};

function ExcelUploadCard({ onUploadComplete }: ExcelUploadCardProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: uploadRejectionsExcel,
    onSuccess: (data) => {
      setResult(data);
      setErrorMessage(null);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["rejections"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      onUploadComplete?.();
    },
    onError: (error: any) => {
      const responseMessage: string =
        error?.response?.data?.message || error?.message || "Upload failed. Please try again.";
      const responseErrors = error?.response?.data?.errors;
      setResult(
        responseErrors
          ? {
              message: responseMessage,
              inserted: 0,
              errors: responseErrors,
              entries: []
            }
          : null
      );
      setErrorMessage(responseMessage);
    }
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setErrorMessage(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setErrorMessage("Select an Excel file before uploading.");
      return;
    }
    mutation.mutate(selectedFile);
  };

  return (
    <Card>
      <CardHeader
        title="Bulk Upload via Excel"
        subheader="Import multiple rejections in one go using the standard template."
      />
      <Divider />
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <label htmlFor="excel-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                disabled={mutation.isPending}
              >
                Choose File
              </Button>
            </label>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedFile ? selectedFile.name : "No file selected"}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={mutation.isPending}
            sx={{ alignSelf: "flex-start" }}
          >
            {mutation.isPending ? "Uploading..." : "Upload & Import"}
          </Button>

          <Typography variant="body2" color="text.secondary">
            Expected columns: Date (dd/MM/yyyy), Shift, BatchNo, Line, Stage, EquipmentId, RejectionType,
            Quantity, UpdatedBy. EquipmentId may be left blank for stages other than VI-1.
          </Typography>

          {errorMessage && !result && <Alert severity="error">{errorMessage}</Alert>}

          {result && (
            <Stack spacing={2}>
              <Alert severity={result.inserted ? "success" : "warning"}>{result.message}</Alert>
              <Stack direction="row" spacing={2}>
                <Chip label={`Imported: ${result.inserted}`} color="success" variant="outlined" />
                <Chip label={`Errors: ${result.errors.length}`} color="error" variant="outlined" />
              </Stack>
              {result.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Rows Requiring Attention
                  </Typography>
                  <List dense disablePadding>
                    {result.errors.map((item) => (
                      <ListItem key={item.row} sx={{ py: 0.5 }}>
                        <Typography variant="body2" color="error">
                          Row {item.row}: {item.message}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ExcelUploadCard;
