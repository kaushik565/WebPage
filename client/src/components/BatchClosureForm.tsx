import { useEffect, useMemo } from "react";
import Grid from "@mui/material/Unstable_Grid2";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  FormHelperText,
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
import { Controller, useFieldArray, useForm, type Path } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BatchClosureDetailRow,
  BatchClosurePayload,
  createBatchClosure
} from "../api.ts";
import { useLookups } from "../hooks/useLookups.ts";
import { parse, format, isValid } from "date-fns";

const createDefaultDetailRows = () =>
  Array.from({ length: 15 }, () => ({
    dumpInsertion: 0,
    acceptedOutput: 0,
    rejections: 0,
    annealing: 0
  }));

type FormValues = {
  batchNumber: string;
  line: string;
  lotLabel: string;
  closureGivenBy: string;
  shift: string;
  productionDate: string; // dd/MM/yyyy
  totalAccepted: number;
  totalAnnealing: number;
  batchQuantity: number;
  totalRejections: number;
  dumpTotalRejections: number;
  remarks: string;
  componentSummary: {
    filterRodTotal: number;
    filterRodLeftover: number;
    filterRodInlineRejection: number;
    dump2Total: number;
    dump2Leftover: number;
    dump2InlineRejection: number;
    sampleFilterTotal: number;
    sampleFilterLeftover: number;
    sampleFilterInlineRejection: number;
  };
  detailRows: BatchClosureDetailRow[];
};

const getDumpDefaultValues = (batchNumber: string, lineValue: string, lotIndex: number): FormValues => {
  const lotLabel = String(lotIndex);
  return {
    batchNumber,
    line: lineValue,
    lotLabel,
    closureGivenBy: "",
    shift: "",
    productionDate: format(new Date(), "dd/MM/yyyy"),
    totalAccepted: 0,
    totalAnnealing: 0,
    batchQuantity: 0,
    totalRejections: 0,
    dumpTotalRejections: 0,
    remarks: "",
    componentSummary: {
      filterRodTotal: 0,
      filterRodLeftover: 0,
      filterRodInlineRejection: 0,
      dump2Total: 0,
      dump2Leftover: 0,
      dump2InlineRejection: 0,
      sampleFilterTotal: 0,
      sampleFilterLeftover: 0,
      sampleFilterInlineRejection: 0
    },
    detailRows: createDefaultDetailRows()
  };
};

const defaultValues: FormValues = getDumpDefaultValues("", "", 1);

type DumpClosureFormProps = {
  batchNumber: string;
  line: string;
  lotIndex: number;
  onSubmitted?: () => void;
};

function DumpClosureForm({ batchNumber, line, lotIndex, onSubmitted }: DumpClosureFormProps) {
  const queryClient = useQueryClient();
  const { data: lookups } = useLookups();

  const computedDefaults = useMemo(
    () => getDumpDefaultValues(batchNumber, line, lotIndex),
    [batchNumber, line, lotIndex]
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue
  } = useForm<FormValues>({
    defaultValues: computedDefaults
  });

  useEffect(() => {
    reset(computedDefaults);
  }, [computedDefaults, reset]);

  const detailArray = useFieldArray({ control, name: "detailRows" });
  const lineOptions = useMemo(() => lookups?.lines ?? ["A", "B", "C", "D", "E", "G"], [lookups?.lines]);

  const mutation = useMutation({
    mutationFn: (payload: BatchClosurePayload) => createBatchClosure(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-closures"] });
      const currentLine = watch("line");
      reset(getDumpDefaultValues(batchNumber, currentLine || line, lotIndex));
      onSubmitted?.();
    }
  });

  const onSubmit = (values: FormValues) => {
    const parsedDate = parse(values.productionDate, "dd/MM/yyyy", new Date());
    if (!isValid(parsedDate)) {
      return;
    }

    const detailRows = values.detailRows.map((row) => ({
      dumpInsertion: Number(row.dumpInsertion) || 0,
      acceptedOutput: Number(row.acceptedOutput) || 0,
      rejections: Number(row.rejections) || 0,
      annealing: Number(row.annealing) || 0
    }));

    const detailTotals = detailRows.reduce(
      (acc, row) => ({
        dumpInsertion: acc.dumpInsertion + row.dumpInsertion,
        acceptedOutput: acc.acceptedOutput + row.acceptedOutput,
        rejections: acc.rejections + row.rejections,
        annealing: acc.annealing + row.annealing
      }),
      {
        dumpInsertion: 0,
        acceptedOutput: 0,
        rejections: 0,
        annealing: 0
      }
    );

    const batchInput = Number(values.batchQuantity) || 0;
    const dumpRejections = Number(values.dumpTotalRejections || values.totalRejections || 0);
    const remainingForMatrix = Math.max(batchInput - dumpRejections, 0);

    const payload: BatchClosurePayload = {
      stageType: "DumpToAnnealing",
      batchNumber,
      line: values.line,
      lotLabel: values.lotLabel || undefined,
      lotNumber: lotIndex,
      closureGivenBy: values.closureGivenBy,
      shift: values.shift,
      productionDate: format(parsedDate, "yyyy-MM-dd"),
      totalAccepted: Number(values.totalAccepted) || 0,
      totalAnnealing: Number(values.totalAnnealing) || 0,
      batchQuantity: Number(values.batchQuantity) || undefined,
      totalRejections: Number(values.totalRejections) || undefined,
      dumpTotalRejections: Number(values.dumpTotalRejections) || undefined,
      remarks: values.remarks || undefined,
      componentSummary: {
        filterRod: {
          totalQuantity: Number(values.componentSummary.filterRodTotal) || 0,
          leftoverQuantity: Number(values.componentSummary.filterRodLeftover) || 0,
          inlineChildRejections: Number(values.componentSummary.filterRodInlineRejection) || 0
        },
        dump2: {
          totalQuantity: Number(values.componentSummary.dump2Total) || 0,
          leftoverQuantity: Number(values.componentSummary.dump2Leftover) || 0,
          inlineChildRejections: Number(values.componentSummary.dump2InlineRejection) || 0
        },
        sampleFilter: {
          totalQuantity: Number(values.componentSummary.sampleFilterTotal) || 0,
          leftoverQuantity: Number(values.componentSummary.sampleFilterLeftover) || 0,
          inlineChildRejections: Number(values.componentSummary.sampleFilterInlineRejection) || 0
        }
      },
      detailRows,
      detailTotals: {
        ...detailTotals,
        batchInput,
        remainingForNextStage: remainingForMatrix
      },
      flowSummary: {
        initialBatchQuantity: batchInput || undefined,
        dumpRejections: dumpRejections || undefined,
        remainingForMatrix: remainingForMatrix || undefined,
        matrixInput: remainingForMatrix || undefined
      }
    };

    mutation.mutate(payload);
  };

  const detailRowsWatch = (watch("detailRows", []) as BatchClosureDetailRow[] | undefined) ?? [];
  const totalAcceptedField = watch("totalAccepted") as number | string | undefined;
  const totalAnnealingField = watch("totalAnnealing") as number | string | undefined;
  const totalRejectionsField = watch("totalRejections") as number | string | undefined;
  const dumpTotalRejectionsField = watch("dumpTotalRejections") as number | string | undefined;

  const detailTotalsDisplay = detailRowsWatch.reduce(
    (acc, row) => ({
      dumpInsertion: acc.dumpInsertion + Number(row.dumpInsertion || 0),
      acceptedOutput: acc.acceptedOutput + Number(row.acceptedOutput || 0),
      rejections: acc.rejections + Number(row.rejections || 0),
      annealing: acc.annealing + Number(row.annealing || 0)
    }),
    {
      dumpInsertion: 0,
      acceptedOutput: 0,
      rejections: 0,
      annealing: 0
    }
  );

  useEffect(() => {
    const acceptedOutput = detailTotalsDisplay.acceptedOutput || 0;
    if (Number(totalAcceptedField ?? 0) !== acceptedOutput) {
      setValue("totalAccepted", acceptedOutput, { shouldDirty: true, shouldValidate: false });
    }

    const annealing = detailTotalsDisplay.annealing || 0;
    if (Number(totalAnnealingField ?? 0) !== annealing) {
      setValue("totalAnnealing", annealing, { shouldDirty: true, shouldValidate: false });
    }

    const rejections = detailTotalsDisplay.rejections || 0;
    if (Number(totalRejectionsField ?? 0) !== rejections) {
      setValue("totalRejections", rejections, { shouldDirty: true, shouldValidate: false });
    }

    if (Number(dumpTotalRejectionsField ?? 0) !== rejections) {
      setValue("dumpTotalRejections", rejections, { shouldDirty: true, shouldValidate: false });
    }
  }, [
    detailTotalsDisplay.acceptedOutput,
    detailTotalsDisplay.annealing,
    detailTotalsDisplay.rejections,
    dumpTotalRejectionsField,
    setValue,
    totalAcceptedField,
    totalAnnealingField,
    totalRejectionsField
  ]);

  const materialRowsConfig: Array<{ label: string; totalName: Path<FormValues>; leftoverName: Path<FormValues>; inlineName: Path<FormValues> }> = [
    {
      label: "Filter Rod",
      totalName: "componentSummary.filterRodTotal",
      leftoverName: "componentSummary.filterRodLeftover",
      inlineName: "componentSummary.filterRodInlineRejection"
    },
    {
      label: "Dump 2",
      totalName: "componentSummary.dump2Total",
      leftoverName: "componentSummary.dump2Leftover",
      inlineName: "componentSummary.dump2InlineRejection"
    },
    {
      label: "Sample Filter",
      totalName: "componentSummary.sampleFilterTotal",
      leftoverName: "componentSummary.sampleFilterLeftover",
      inlineName: "componentSummary.sampleFilterInlineRejection"
    }
  ];

  return (
    <Card>
      <CardHeader title="Batch Closure – Dump Insertion to Annealing" subheader="Record the shift-wise batch closure data." />
      <Divider />
      <CardContent>
        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Unable to save batch closure. Please verify inputs and try again.
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={4}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Batch Details
              </Typography>
              <Grid container spacing={2.5}>
                <Grid xs={12} md={4}>
                  <TextField label="Batch Number" value={batchNumber} fullWidth InputProps={{ readOnly: true }} />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="line"
                    control={control}
                    rules={{ required: "Line is required" }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.line}>
                        <InputLabel id="line-select-label">Line</InputLabel>
                        <Select {...field} labelId="line-select-label" label="Line">
                          {lineOptions.map((lineOption) => (
                            <MenuItem key={lineOption} value={lineOption}>
                              Line {lineOption}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.line && <FormHelperText>{errors.line.message}</FormHelperText>}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="lotLabel"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Lot Number" fullWidth />}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="closureGivenBy"
                    control={control}
                    rules={{ required: "Closure given by is required" }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.closureGivenBy}>
                        <InputLabel id="closure-given-by-label">Closure Given By</InputLabel>
                        <Select
                          {...field}
                          labelId="closure-given-by-label"
                          label="Closure Given By"
                        >
                          {(lookups?.updatedBy ?? []).map((name) => (
                            <MenuItem key={name} value={name}>
                              {name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.closureGivenBy && (
                          <FormHelperText>{errors.closureGivenBy.message}</FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="shift"
                    control={control}
                    rules={{ required: "Shift is required" }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.shift}>
                        <InputLabel id="shift-select-label">Shift</InputLabel>
                        <Select {...field} labelId="shift-select-label" label="Shift">
                          {(["A", "B", "C"] as const).map((shift) => (
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
                <Grid xs={12} md={4}>
                  <Controller
                    name="productionDate"
                    control={control}
                    rules={{ required: "Batch closure date is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Batch Closure Date"
                        placeholder="dd/MM/yyyy"
                        fullWidth
                        error={!!errors.productionDate}
                        helperText={errors.productionDate?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="totalAccepted"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Total Accepted" fullWidth />
                    )}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="totalAnnealing"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Total Annealing" fullWidth />
                    )}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="batchQuantity"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Batch Quantity" fullWidth />
                    )}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="totalRejections"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Total Rejections" fullWidth />
                    )}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <Controller
                    name="dumpTotalRejections"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Dump Total Rejections" fullWidth />
                    )}
                  />
                </Grid>
                <Grid xs={12}>
                  <Controller
                    name="remarks"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Remarks" multiline rows={3} fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Material Details
              </Typography>
              <TableContainer>
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
                    {materialRowsConfig.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell align="right">
                          <Controller
                            name={row.totalName}
                            control={control}
                            render={({ field }) => (
                              <TextField {...field} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Controller
                            name={row.leftoverName}
                            control={control}
                            render={({ field }) => (
                              <TextField {...field} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Controller
                            name={row.inlineName}
                            control={control}
                            render={({ field }) => (
                              <TextField {...field} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Dump Insertion Details</Typography>
                <Button
                  variant="outlined"
                  onClick={() => detailArray.append({
                    dumpInsertion: 0,
                    acceptedOutput: 0,
                    rejections: 0,
                    annealing: 0
                  })}
                >
                  Add Row
                </Button>
              </Stack>
              <TableContainer component={Paper} variant="outlined">
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
                    {detailArray.fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.dumpInsertion` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Controller
                            name={`detailRows.${index}.acceptedOutput` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Controller
                            name={`detailRows.${index}.rejections` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Controller
                            name={`detailRows.${index}.annealing` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                      <TableCell>
                        <strong>{detailTotalsDisplay.dumpInsertion ?? 0}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailTotalsDisplay.acceptedOutput ?? 0}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailTotalsDisplay.rejections ?? 0}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{detailTotalsDisplay.annealing ?? 0}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                onClick={() => {
                  const currentLine = watch("line");
                  reset(getDumpDefaultValues(batchNumber, currentLine || line, lotIndex));
                }}
                disabled={mutation.isPending}
              >
                Reset
              </Button>
              <Button type="submit" variant="contained" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Batch Closure"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export default DumpClosureForm;
