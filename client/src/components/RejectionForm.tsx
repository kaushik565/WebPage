import { useMemo, useState } from "react";
import Grid from "@mui/material/Unstable_Grid2";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { RejectionFormData, createRejectionEntriesBulk, LookupData } from "../api.ts";
import { format, isValid, parse } from "date-fns";

type RejectionFormProps = {
  lookups: LookupData;
  onSubmitted?: () => void;
};

const displayDateFormat = "dd/MM/yyyy";
const isoDateFormat = "yyyy-MM-dd";
const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
const todayDisplay = format(new Date(), displayDateFormat);

type FormValues = {
  entryDate: string;
  shift: string;
  batchNo: string;
  line: string;
  stage: string;
  equipmentId: string;
  rejectionType: string;
  quantity: number;
  updatedBy: string;
};

const defaultValues: FormValues = {
  entryDate: todayDisplay,
  shift: "",
  batchNo: "",
  line: "",
  stage: "",
  equipmentId: "",
  rejectionType: "",
  quantity: 1,
  updatedBy: ""
};

function RejectionForm({ lookups, onSubmitted }: RejectionFormProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingEntries, setPendingEntries] = useState<RejectionFormData[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues,
    mode: "onBlur"
  });

  const selectedLine = watch("line");
  const selectedStage = watch("stage");

  const isStageVI1 = selectedStage === "VI-1";

  const equipmentOptions = useMemo(() => {
    if (!selectedLine || !isStageVI1) {
      return [];
    }
    return lookups.lineEquipments[selectedLine] ?? [];
  }, [isStageVI1, lookups.lineEquipments, selectedLine]);

  const equipmentChoices = isStageVI1 ? equipmentOptions : selectedStage ? ["NA"] : [];

  const rejectionTypeOptions = useMemo(
    () => (selectedStage ? lookups.stageRejectionTypes[selectedStage] ?? [] : []),
    [lookups.stageRejectionTypes, selectedStage]
  );

  const bulkMutation = useMutation({
    mutationFn: (payload: RejectionFormData[]) => createRejectionEntriesBulk(payload),
    onSuccess: () => {
      setSubmitError(null);
      setPendingEntries([]);
      queryClient.invalidateQueries({ queryKey: ["rejections"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      reset({ ...defaultValues, entryDate: todayDisplay });
      onSubmitted?.();
    },
    onError: (error: any) => {
      if (error.response?.data?.message) {
        setSubmitError(error.response.data.message);
      } else {
        setSubmitError("Unable to submit entries. Please try again.");
      }
    }
  });

  const handleAddEntry = (values: FormValues) => {
    const parsedDate = parse(values.entryDate, displayDateFormat, new Date());
    if (!isValid(parsedDate)) {
      setSubmitError("Date must be valid and in dd/MM/yyyy format.");
      return;
    }

    const payload: RejectionFormData = {
      ...values,
      entryDate: format(parsedDate, isoDateFormat),
      quantity: Number(values.quantity),
      equipmentId: values.stage === "VI-1" ? values.equipmentId : "NA"
    };

    if (payload.stage === "VI-1" && !payload.equipmentId) {
      setSubmitError("Select an equipment for stage VI-1.");
      return;
    }

    setPendingEntries((prev) => [...prev, payload]);
    setSubmitError(null);
    reset({
      ...values,
      quantity: 1,
      rejectionType: "",
      equipmentId: values.stage === "VI-1" ? "" : values.stage ? "NA" : ""
    });
  };

  const handleRemoveEntry = (index: number) => {
    setPendingEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitAll = () => {
    if (!pendingEntries.length) {
      setSubmitError("Add at least one rejection before submitting.");
      return;
    }
    bulkMutation.mutate(pendingEntries);
  };

  const pendingTotal = pendingEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);
  const formatIsoToDisplay = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : format(parsed, displayDateFormat);
  };

  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar
            sx={{
              bgcolor: "primary.main",
              color: "common.white",
              fontWeight: 600
            }}
          >
            {watch("line") || "L"}
          </Avatar>
        }
        title="Laser Cartridge Production – Rejection Entry Form"
        subheader="Keep shift and line aligned to ensure the analytics stay precise."
        sx={{
          alignItems: "flex-start",
          "& .MuiCardHeader-title": { fontWeight: 600, fontSize: { xs: 18, md: 20 } },
          "& .MuiCardHeader-subheader": { color: "text.secondary" }
        }}
      />
      <Divider />
      <CardContent sx={{ pt: 3 }}>
        {submitError && (
          <Box mb={2}>
            <Alert severity="error">{submitError}</Alert>
          </Box>
        )}
        <Box component="form" onSubmit={handleSubmit(handleAddEntry)} noValidate>
          <Grid container spacing={2.5}>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="entryDate"
                control={control}
                rules={{
                  required: "Date is required",
                  validate: (value) => {
                    if (!datePattern.test(value)) {
                      return "Use dd/MM/yyyy format";
                    }
                    const parsed = parse(value, displayDateFormat, new Date());
                    return isValid(parsed) ? true : "Invalid date";
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date"
                    placeholder="dd/MM/yyyy"
                    type="text"
                    inputProps={{ inputMode: "numeric", pattern: "\\d{2}/\\d{2}/\\d{4}" }}
                    onBlur={(event) => {
                      field.onBlur();
                      const { value } = event.target;
                      if (datePattern.test(value)) {
                        const parsed = parse(value, displayDateFormat, new Date());
                        if (isValid(parsed)) {
                          field.onChange(format(parsed, displayDateFormat));
                        }
                      }
                    }}
                    fullWidth
                    error={!!errors.entryDate}
                    helperText={errors.entryDate?.message}
                    required
                  />
                )}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="shift"
                control={control}
                rules={{ required: "Shift is required" }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.shift} required>
                    <InputLabel id="shift-label">Shift</InputLabel>
                    <Select {...field} labelId="shift-label" label="Shift">
                      {lookups.shifts.map((shift) => (
                        <MenuItem key={shift} value={shift}>
                          Shift {shift}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.shift && <FormHelperText>{errors.shift.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="batchNo"
                control={control}
                rules={{
                  required: "Batch number is required",
                  minLength: { value: 10, message: "Must be 10 characters" },
                  maxLength: { value: 10, message: "Must be 10 characters" },
                  pattern: {
                    value: /^[A-Za-z0-9]+$/,
                    message: "Use letters and numbers only"
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Batch Number"
                    fullWidth
                    error={!!errors.batchNo}
                    helperText={errors.batchNo?.message}
                    required
                    placeholder="e.g. MVANC00001"
                    inputProps={{ maxLength: 10 }}
                    onChange={(event) => {
                      field.onChange(event.target.value.toUpperCase());
                    }}
                  />
                )}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="line"
                control={control}
                rules={{ required: "Line is required" }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.line} required>
                    <InputLabel id="line-label">Line</InputLabel>
                    <Select
                      {...field}
                      labelId="line-label"
                      label="Line"
                      onChange={(event) => {
                        field.onChange(event);
                        const newLine = event.target.value;
                        if (!newLine) {
                          setValue("equipmentId", "");
                        } else if (selectedStage === "VI-1") {
                          setValue("equipmentId", "");
                        } else if (selectedStage) {
                          setValue("equipmentId", "NA");
                        } else {
                          setValue("equipmentId", "");
                        }
                      }}
                    >
                      {lookups.lines.map((line) => (
                        <MenuItem key={line} value={line}>
                          {line}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.line && <FormHelperText>{errors.line.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="stage"
                control={control}
                rules={{ required: "Stage is required" }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.stage} required>
                    <InputLabel id="stage-label">Stage</InputLabel>
                    <Select
                      {...field}
                      labelId="stage-label"
                      label="Stage"
                      onChange={(event) => {
                        field.onChange(event);
                        const newStage = event.target.value;
                        setValue("rejectionType", "");
                        if (!newStage) {
                          setValue("equipmentId", "");
                        } else if (newStage === "VI-1") {
                          setValue("equipmentId", "");
                        } else {
                          setValue("equipmentId", "NA");
                        }
                      }}
                    >
                      {lookups.stages.map((stage) => (
                        <MenuItem key={stage} value={stage}>
                          {stage}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.stage && <FormHelperText>{errors.stage.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="equipmentId"
                control={control}
                rules={{ required: "Equipment is required" }}
                render={({ field }) => {
                  const equipmentDisabled = !isStageVI1 || !selectedLine;
                  return (
                    <FormControl
                      fullWidth
                      error={!!errors.equipmentId}
                      required
                      disabled={equipmentDisabled}
                    >
                      <InputLabel id="equipment-label">Equipment ID</InputLabel>
                      <Select {...field} labelId="equipment-label" label="Equipment ID">
                        {equipmentChoices.map((equipment) => (
                          <MenuItem key={equipment} value={equipment}>
                            {equipment}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.equipmentId && <FormHelperText>{errors.equipmentId.message}</FormHelperText>}
                    </FormControl>
                  );
                }}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="rejectionType"
                control={control}
                rules={{ required: "Rejection type is required" }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.rejectionType} required disabled={!selectedStage}>
                    <InputLabel id="rejection-type-label">Type of Rejection</InputLabel>
                    <Select {...field} labelId="rejection-type-label" label="Type of Rejection">
                      {rejectionTypeOptions.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.rejectionType && (
                      <FormHelperText>{errors.rejectionType.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="quantity"
                control={control}
                rules={{
                  required: "Quantity is required",
                  min: { value: 1, message: "Quantity must be at least 1" }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Quantity"
                    fullWidth
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                    required
                    inputProps={{ min: 1 }}
                  />
                )}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Controller
                name="updatedBy"
                control={control}
                rules={{ required: "Updated by is required" }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.updatedBy} required>
                    <InputLabel id="updated-by-label">Updated By</InputLabel>
                    <Select {...field} labelId="updated-by-label" label="Updated By">
                      {lookups.updatedBy.map((name) => (
                        <MenuItem key={name} value={name}>
                          {name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.updatedBy && <FormHelperText>{errors.updatedBy.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid xs={12}>
              <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                <Button
                  variant="outlined"
                  onClick={() => reset({ ...defaultValues, entryDate: todayDisplay })}
                  disabled={bulkMutation.isPending}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={bulkMutation.isPending}
                  sx={{
                    minWidth: 160
                  }}
                >
                  Add To List
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
      <Divider />
      <CardContent sx={{ pt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Pending Queue
          </Typography>
          <Chip label={`Total Qty: ${pendingTotal}`} color="secondary" variant="filled" />
        </Stack>
        {pendingEntries.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            No entries queued yet. Fill the form and click <strong>Add To List</strong>.
          </Alert>
        ) : (
          <>
            <TableContainer sx={{ borderRadius: 3, border: "1px solid rgba(148, 163, 184, 0.2)" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Shift</TableCell>
                    <TableCell>Batch</TableCell>
                    <TableCell>Line</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell>Updated By</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingEntries.map((entry, index) => (
                    <TableRow
                      key={`${entry.batchNo}-${entry.line}-${entry.stage}-${entry.rejectionType}-${index}`}
                      sx={{
                        "&:nth-of-type(odd)": { bgcolor: "rgba(148, 163, 184, 0.08)" }
                      }}
                    >
                      <TableCell>{formatIsoToDisplay(entry.entryDate)}</TableCell>
                      <TableCell>{entry.shift}</TableCell>
                      <TableCell>{entry.batchNo}</TableCell>
                      <TableCell>{entry.line}</TableCell>
                      <TableCell>{entry.stage}</TableCell>
                      <TableCell>{entry.equipmentId}</TableCell>
                      <TableCell>{entry.rejectionType}</TableCell>
                      <TableCell align="right">{entry.quantity}</TableCell>
                      <TableCell>{entry.updatedBy}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Remove from queue">
                          <span>
                            <IconButton
                              aria-label="remove entry"
                              size="small"
                              onClick={() => handleRemoveEntry(index)}
                              disabled={bulkMutation.isPending}
                              sx={{ color: "error.main" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
      <CardActions
        sx={{
          px: 3,
          pb: 3,
          display: "flex",
          justifyContent: "flex-end"
        }}
      >
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmitAll}
          disabled={bulkMutation.isPending || pendingEntries.length === 0}
          sx={{ minWidth: 200 }}
        >
          {bulkMutation.isPending
            ? "Submitting..."
            : `Submit ${pendingEntries.length} Entry${pendingEntries.length > 1 ? "s" : ""}`}
        </Button>
      </CardActions>
    </Card>
  );
}

export default RejectionForm;
