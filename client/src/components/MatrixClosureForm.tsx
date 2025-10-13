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
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parse, isValid } from "date-fns";
import { MatrixDetailRow, MatrixStageData, BatchClosurePayload, createBatchClosure } from "../api.ts";
import { useLookups } from "../hooks/useLookups.ts";

const createDefaultMatrixRows = () =>
  Array.from({ length: 12 }, () => ({
    totalAccepted: 0,
    vi02: 0,
    vi03: 0,
    vacuum: 0,
    vi04: 0,
    vi04Rework: 0,
    rejection: 0,
    output: 0,
    yieldPercent: 0
  }));

type MaterialTotalsForm = {
  matrixTotal: number;
  matrixLeftover: number;
  rightValveCapTotal: number;
  rightValveCapLeftover: number;
  assembledSmileyTotal: number;
  assembledSmileyLeftover: number;
  leftValveCapTotal: number;
  leftValveCapLeftover: number;
  bufferCapTotal: number;
  bufferCapLeftover: number;
};

type InlineChildPartsForm = {
  matrix: number;
  assembledSmiley: number;
  leftValveCap: number;
  rightValveCap: number;
  bufferCap: number;
};

type AuxiliaryTotalsForm = {
  aluminumFoilTotal: number;
  aluminumFoilLeftover: number;
  flurosiliconOilTotal: number;
  flurosiliconOilLeftover: number;
};

type RejectionStagesForm = {
  vi2: number;
  vi3: number;
  vacuum: number;
  vi4: number;
  vi4Rework: number;
};

type MatrixCartridgeType = "NC" | "L" | "LR" | "UNKNOWN";

type MatrixClosureFormValues = {
  batchNumber: string;
  lotLabel: string;
  line: string;
  closureGivenBy: string;
  shift: string;
  productionDate: string;
  totalAccepted: number;
  totalOutput: number;
  totalRejections: number;
  batchQuantity: number;
  remarks: string;
  materialTotals: MaterialTotalsForm;
  inlineChildParts: InlineChildPartsForm;
  auxiliaryTotals: AuxiliaryTotalsForm;
  rejectionStages: RejectionStagesForm;
  detailRows: MatrixDetailRow[];
};

type MaterialRowConfig = {
  label: string;
  totalKey: keyof MaterialTotalsForm;
  leftoverKey: keyof MaterialTotalsForm;
  show: boolean;
};

type InlineChildPartRowConfig = {
  label: string;
  key: keyof InlineChildPartsForm;
  show: boolean;
};

const REJECTION_STAGE_OPTIONS: Array<{ label: string; key: keyof RejectionStagesForm }> = [
  { label: "VI-2", key: "vi2" },
  { label: "VI-3", key: "vi3" },
  { label: "Vacuum", key: "vacuum" },
  { label: "VI-4", key: "vi4" },
  { label: "VI-4 Rework", key: "vi4Rework" }
];

const getMatrixDefaultValues = (
  batchNumber: string,
  cartridgeType: MatrixCartridgeType,
  lineValue: string,
  lotIndex: number
): MatrixClosureFormValues => {
  const lotLabel = String(lotIndex);
  const baseDetailRows = createDefaultMatrixRows();
  return {
    batchNumber,
    line: lineValue,
    lotLabel,
    closureGivenBy: "",
    shift: "",
    productionDate: format(new Date(), "dd/MM/yyyy"),
    totalAccepted: 0,
    totalOutput: 0,
    totalRejections: 0,
    batchQuantity: 0,
    remarks: "",
    materialTotals: {
      matrixTotal: 0,
      matrixLeftover: 0,
      rightValveCapTotal: 0,
      rightValveCapLeftover: 0,
      assembledSmileyTotal: 0,
      assembledSmileyLeftover: 0,
      leftValveCapTotal: 0,
      leftValveCapLeftover: 0,
      bufferCapTotal: 0,
      bufferCapLeftover: 0
    },
    inlineChildParts: {
      matrix: 0,
      assembledSmiley: 0,
      leftValveCap: 0,
      rightValveCap: 0,
      bufferCap: 0
    },
    auxiliaryTotals: {
      aluminumFoilTotal: 0,
      aluminumFoilLeftover: 0,
      flurosiliconOilTotal: 0,
      flurosiliconOilLeftover: 0
    },
    rejectionStages: {
      vi2: 0,
      vi3: 0,
      vacuum: 0,
      vi4: 0,
      vi4Rework: 0
    },
    detailRows: baseDetailRows
  };
};

const defaultValues: MatrixClosureFormValues = getMatrixDefaultValues("", "NC", "", 1);

type MatrixClosureFormProps = {
  batchNumber: string;
  line: string;
  cartridgeType: MatrixCartridgeType;
  lotIndex: number;
  onSubmitted?: () => void;
};

function MatrixClosureForm({ batchNumber, line, cartridgeType, lotIndex, onSubmitted }: MatrixClosureFormProps) {
  const queryClient = useQueryClient();
  const { data: lookups } = useLookups();

  const computedDefaults = useMemo(
    () => getMatrixDefaultValues(batchNumber, cartridgeType, line, lotIndex),
    [batchNumber, cartridgeType, line, lotIndex]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch
  } = useForm<MatrixClosureFormValues>({
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
      reset(getMatrixDefaultValues(batchNumber, cartridgeType, currentLine || line, lotIndex));
      onSubmitted?.();
    }
  });

  const showLeftValve = cartridgeType !== "NC";
  const showBufferCap = cartridgeType === "L";

  const materialRows = useMemo(() => {
    const rows: MaterialRowConfig[] = [
      { label: "Matrix", totalKey: "matrixTotal", leftoverKey: "matrixLeftover", show: true },
      {
        label: "Right Valve Cap",
        totalKey: "rightValveCapTotal",
        leftoverKey: "rightValveCapLeftover",
        show: true
      },
      {
        label: "Assembled Smiley",
        totalKey: "assembledSmileyTotal",
        leftoverKey: "assembledSmileyLeftover",
        show: true
      },
      {
        label: "Left Valve Cap",
        totalKey: "leftValveCapTotal",
        leftoverKey: "leftValveCapLeftover",
        show: showLeftValve
      },
      {
        label: "Buffer Cap",
        totalKey: "bufferCapTotal",
        leftoverKey: "bufferCapLeftover",
        show: showBufferCap
      }
    ];
    return rows.filter((row) => row.show);
  }, [showLeftValve, showBufferCap]);

  const inlineChildPartRows = useMemo(() => {
    const rows: InlineChildPartRowConfig[] = [
      { label: "Matrix", key: "matrix", show: true },
      { label: "Assembled Smiley", key: "assembledSmiley", show: true },
      { label: "Left Valve Cap", key: "leftValveCap", show: showLeftValve },
      { label: "Right Valve Cap", key: "rightValveCap", show: true },
      { label: "Buffer Cap", key: "bufferCap", show: showBufferCap }
    ];
    return rows.filter((row) => row.show);
  }, [showLeftValve, showBufferCap]);

  const onSubmit = (values: MatrixClosureFormValues) => {
    const parsedDate = parse(values.productionDate, "dd/MM/yyyy", new Date());
    if (!isValid(parsedDate)) {
      return;
    }

    const detailRows = values.detailRows
      .map((row) => ({
        totalAccepted: Number(row.totalAccepted) || 0,
        vi02: Number(row.vi02) || 0,
        vi03: Number(row.vi03) || 0,
        vacuum: Number(row.vacuum) || 0,
        vi04: Number(row.vi04) || 0,
        vi04Rework: Number(row.vi04Rework) || 0,
        rejection: Number(row.rejection) || 0,
        output: Number(row.output) || 0,
        yieldPercent: Number(row.yieldPercent) || 0
      }))
      .filter((row) =>
        Object.values(row).some((value) => typeof value === "number" && value !== 0)
      );

    const stageData: MatrixStageData = {
      cartridgeType,
      line: values.line,
      materialTotals: {
        matrix: {
          totalQuantity: Number(values.materialTotals.matrixTotal) || 0,
          leftoverQuantity: Number(values.materialTotals.matrixLeftover) || 0
        },
        rightValveCap: {
          totalQuantity: Number(values.materialTotals.rightValveCapTotal) || 0,
          leftoverQuantity: Number(values.materialTotals.rightValveCapLeftover) || 0
        },
        assembledSmiley: {
          totalQuantity: Number(values.materialTotals.assembledSmileyTotal) || 0,
          leftoverQuantity: Number(values.materialTotals.assembledSmileyLeftover) || 0
        },
        leftValveCap: {
          totalQuantity: showLeftValve ? Number(values.materialTotals.leftValveCapTotal) || 0 : 0,
          leftoverQuantity: showLeftValve ? Number(values.materialTotals.leftValveCapLeftover) || 0 : 0
        },
        bufferCap: {
          totalQuantity: showBufferCap ? Number(values.materialTotals.bufferCapTotal) || 0 : 0,
          leftoverQuantity: showBufferCap ? Number(values.materialTotals.bufferCapLeftover) || 0 : 0
        }
      },
      inlineChildParts: {
        matrix: Number(values.inlineChildParts.matrix) || 0,
        assembledSmiley: Number(values.inlineChildParts.assembledSmiley) || 0,
        leftValveCap: showLeftValve ? Number(values.inlineChildParts.leftValveCap) || 0 : 0,
        rightValveCap: Number(values.inlineChildParts.rightValveCap) || 0,
        bufferCap: showBufferCap ? Number(values.inlineChildParts.bufferCap) || 0 : 0
      },
      auxiliaryTotals: {
        aluminumFoil: {
          totalQuantity: Number(values.auxiliaryTotals.aluminumFoilTotal) || 0,
          leftoverQuantity: Number(values.auxiliaryTotals.aluminumFoilLeftover) || 0
        },
        flurosiliconOil: {
          totalQuantity: Number(values.auxiliaryTotals.flurosiliconOilTotal) || 0,
          leftoverQuantity: Number(values.auxiliaryTotals.flurosiliconOilLeftover) || 0
        }
      },
      rejectionStages: {
        vi2: Number(values.rejectionStages.vi2) || 0,
        vi3: Number(values.rejectionStages.vi3) || 0,
        vacuum: Number(values.rejectionStages.vacuum) || 0,
        vi4: Number(values.rejectionStages.vi4) || 0,
        vi4Rework: Number(values.rejectionStages.vi4Rework) || 0
      },
      detailRows,
      totals: {
        totalAccepted: Number(values.totalAccepted) || 0,
        totalOutput: Number(values.totalOutput) || 0,
        totalRejections: Number(values.totalRejections) || 0
      }
    };

    const payload: BatchClosurePayload = {
      stageType: "MatrixToPouch",
      batchNumber,
      line: values.line,
      lotLabel: values.lotLabel || undefined,
      lotNumber: lotIndex,
      closureGivenBy: values.closureGivenBy,
      shift: values.shift,
      productionDate: format(parsedDate, "yyyy-MM-dd"),
      totalAccepted: Number(values.totalAccepted) || 0,
      totalAnnealing: Number(values.totalOutput) || 0,
      totalRejections: Number(values.totalRejections) || 0,
      batchQuantity: Number(values.batchQuantity) || undefined,
      remarks: values.remarks || undefined,
      componentSummary: undefined,
      detailRows: [],
      stageData
    };

    mutation.mutate(payload);
  };

  const detailRowsWatch = watch("detailRows") ?? [];

  const detailTotals = detailRowsWatch.reduce(
    (acc, row) => ({
      totalAccepted: acc.totalAccepted + Number(row.totalAccepted || 0),
      vi02: acc.vi02 + Number(row.vi02 || 0),
      vi03: acc.vi03 + Number(row.vi03 || 0),
      vacuum: acc.vacuum + Number(row.vacuum || 0),
      vi04: acc.vi04 + Number(row.vi04 || 0),
      vi04Rework: acc.vi04Rework + Number(row.vi04Rework || 0),
      rejection: acc.rejection + Number(row.rejection || 0),
      output: acc.output + Number(row.output || 0)
    }),
    {
      totalAccepted: 0,
      vi02: 0,
      vi03: 0,
      vacuum: 0,
      vi04: 0,
      vi04Rework: 0,
      rejection: 0,
      output: 0
    }
  );

  return (
    <Card>
      <CardHeader title="Batch Closure – Matrix Pallet Filling to Pouch Packing" subheader="Log matrix pallet closure metrics." />
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
                        <InputLabel id="matrix-line-select-label">Line</InputLabel>
                        <Select {...field} labelId="matrix-line-select-label" label="Line">
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
                  <TextField
                    label="Cartridge Type"
                    value={cartridgeType}
                    fullWidth
                    InputProps={{ readOnly: true }}
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
                        <InputLabel id="matrix-closure-given-by">Closure Given By</InputLabel>
                        <Select {...field} labelId="matrix-closure-given-by" label="Closure Given By">
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
                        <InputLabel id="matrix-shift-label">Shift</InputLabel>
                        <Select {...field} labelId="matrix-shift-label" label="Shift">
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
                    rules={{ required: "Production date is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Production Date"
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
                    name="totalOutput"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Total Output" fullWidth />
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
                    name="batchQuantity"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Batch Quantity" fullWidth />
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
                Material Totals
              </Typography>
              <Grid container spacing={2.5}>
                {materialRows.map((item) => (
                  <Grid key={item.label} xs={12} md={4}>
                    <Typography variant="subtitle2" gutterBottom>
                      {item.label}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Controller
                        name={`materialTotals.${item.totalKey}` as const}
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} type="number" label="Total" fullWidth />
                        )}
                      />
                      <Controller
                        name={`materialTotals.${item.leftoverKey}` as const}
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} type="number" label="Leftover" fullWidth />
                        )}
                      />
                    </Stack>
                  </Grid>
                ))}
              </Grid>

              <Stack spacing={2} mt={3}>
                <Typography variant="subtitle2">Inline Child Parts</Typography>
                <Grid container spacing={2.5}>
                  {inlineChildPartRows.map((item) => (
                    <Grid key={item.key} xs={12} md={4}>
                      <Controller
                        name={`inlineChildParts.${item.key}` as const}
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} type="number" label={item.label} fullWidth />
                        )}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Stack>

              <Stack spacing={2} mt={3}>
                <Typography variant="subtitle2">Auxiliary Totals</Typography>
                <Grid container spacing={2.5}>
                  <Grid xs={12} md={4}>
                    <Typography variant="body2" gutterBottom>
                      Aluminum Foil
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Controller
                        name="auxiliaryTotals.aluminumFoilTotal"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} type="number" label="Total" fullWidth />
                        )}
                      />
                      <Controller
                        name="auxiliaryTotals.aluminumFoilLeftover"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} type="number" label="Leftover" fullWidth />
                        )}
                      />
                    </Stack>
                  </Grid>
                  <Grid xs={12} md={4}>
                    <Typography variant="body2" gutterBottom>
                      Fluorosilicon Oil
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Controller
                        name="auxiliaryTotals.flurosiliconOilTotal"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} type="number" label="Total" fullWidth />
                        )}
                      />
                      <Controller
                        name="auxiliaryTotals.flurosiliconOilLeftover"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} type="number" label="Leftover" fullWidth />
                        )}
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Rejection Stages
              </Typography>
              <Grid container spacing={2.5}>
                {REJECTION_STAGE_OPTIONS.map((item) => (
                  <Grid key={item.key} xs={12} md={4}>
                    <Controller
                      name={`rejectionStages.${item.key}` as const}
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} type="number" label={item.label} fullWidth />
                      )}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Stage-wise Yield Data</Typography>
                <Button
                  variant="outlined"
                  onClick={() =>
                    detailArray.append({
                      totalAccepted: 0,
                      vi02: 0,
                      vi03: 0,
                      vacuum: 0,
                      vi04: 0,
                      vi04Rework: 0,
                      rejection: 0,
                      output: 0,
                      yieldPercent: 0
                    })
                  }
                >
                  Add Row
                </Button>
              </Stack>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Total Accepted</TableCell>
                      <TableCell>VI-02</TableCell>
                      <TableCell>VI-03</TableCell>
                      <TableCell>Vacuum</TableCell>
                      <TableCell>VI-04</TableCell>
                      <TableCell>VI-04 Rework</TableCell>
                      <TableCell>Rejection</TableCell>
                      <TableCell>Output</TableCell>
                      <TableCell>Yield %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailArray.fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.totalAccepted` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.vi02` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.vi03` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.vacuum` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.vi04` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.vi04Rework` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.rejection` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.output` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`detailRows.${index}.yieldPercent` as const}
                            control={control}
                            render={({ field: inner }) => (
                              <TextField {...inner} type="number" size="small" />
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: "rgba(0,0,0,0.04)" }}>
                      <TableCell><strong>{detailTotals.totalAccepted}</strong></TableCell>
                      <TableCell><strong>{detailTotals.vi02}</strong></TableCell>
                      <TableCell><strong>{detailTotals.vi03}</strong></TableCell>
                      <TableCell><strong>{detailTotals.vacuum}</strong></TableCell>
                      <TableCell><strong>{detailTotals.vi04}</strong></TableCell>
                      <TableCell><strong>{detailTotals.vi04Rework}</strong></TableCell>
                      <TableCell><strong>{detailTotals.rejection}</strong></TableCell>
                      <TableCell><strong>{detailTotals.output}</strong></TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">Totals</Typography>
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
                  reset(getMatrixDefaultValues(batchNumber, cartridgeType, currentLine || line, lotIndex));
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

export default MatrixClosureForm;
