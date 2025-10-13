import { z } from "zod";
import {
  lines,
  lineEquipments,
  stages,
  stageRejectionTypes,
  shifts,
  updatedByList
} from "./lookup-data.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createRejectionSchema = z
  .object({
    entryDate: z
      .string()
      .regex(dateRegex, "entryDate must be in YYYY-MM-DD format")
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "entryDate must be a valid date"
      }),
    shift: z.enum(shifts),
    batchNo: z
      .string()
      .min(1, "batchNo is required")
      .length(10, "batchNo must be exactly 10 characters"),
    line: z.enum(lines),
    stage: z.enum(stages),
    equipmentId: z.string().min(1, "equipmentId is required"),
    rejectionType: z.string().min(1, "rejectionType is required"),
    quantity: z.coerce.number().int().positive("quantity must be > 0"),
    updatedBy: z.enum(updatedByList)
  })
  .superRefine((data, ctx) => {
    const requiresEquipmentSelection = data.stage === "VI-1";
    const allowedEquipment = lineEquipments[data.line];

    if (requiresEquipmentSelection) {
      if (!allowedEquipment.includes(data.equipmentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `equipmentId must be one of: ${allowedEquipment.join(", ")}`,
          path: ["equipmentId"]
        });
      }
    } else if (data.equipmentId !== "NA") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `equipmentId must be "NA" for stage ${data.stage}`,
        path: ["equipmentId"]
      });
    }

    const allowedRejectionTypes = stageRejectionTypes[data.stage];
    if (!allowedRejectionTypes.includes(data.rejectionType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `rejectionType must match the selected stage`,
        path: ["rejectionType"]
      });
    }
  });

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const bulkRejectionSchema = z
  .array(createRejectionSchema)
  .min(1, "At least one rejection entry is required");

const stageTypeValues = ["DumpToAnnealing", "MatrixToPouch"] as const;

const componentTotalsSchema = z.object({
  totalQuantity: z.coerce.number(),
  leftoverQuantity: z.coerce.number(),
  inlineChildRejections: z.coerce.number().nonnegative().default(0)
});

const flowSummarySchema = z
  .object({
    initialBatchQuantity: z.coerce.number().nonnegative().optional(),
    dumpRejections: z.coerce.number().nonnegative().optional(),
    remainingForMatrix: z.coerce.number().nonnegative().optional(),
    remainingForNextStage: z.coerce.number().nonnegative().optional(),
    matrixInput: z.coerce.number().nonnegative().optional(),
    matrixRejections: z.coerce.number().nonnegative().optional(),
    pouchOutput: z.coerce.number().nonnegative().optional(),
    qcConsumed: z.coerce.number().nonnegative().optional(),
    qcRetained: z.coerce.number().nonnegative().optional(),
    dispatchQuantity: z.coerce.number().nonnegative().optional()
  })
  .optional();

const dumpDetailRowSchema = z.object({
  dumpInsertion: z.coerce.number().nonnegative().default(0),
  acceptedOutput: z.coerce.number().nonnegative().default(0),
  rejections: z.coerce.number().nonnegative().default(0),
  annealing: z.coerce.number().nonnegative().default(0)
});

const matrixMaterialTotalsSchema = z.object({
  matrix: componentTotalsSchema,
  rightValveCap: componentTotalsSchema,
  assembledSmiley: componentTotalsSchema,
  leftValveCap: componentTotalsSchema,
  bufferCap: componentTotalsSchema
});

const matrixInlineChildPartsSchema = z.object({
  matrix: z.coerce.number().nonnegative().default(0),
  assembledSmiley: z.coerce.number().nonnegative().default(0),
  leftValveCap: z.coerce.number().nonnegative().default(0),
  rightValveCap: z.coerce.number().nonnegative().default(0),
  bufferCap: z.coerce.number().nonnegative().default(0)
});

const matrixRejectionStagesSchema = z.object({
  vi2: z.coerce.number().nonnegative().default(0),
  vi3: z.coerce.number().nonnegative().default(0),
  vacuum: z.coerce.number().nonnegative().default(0),
  vi4: z.coerce.number().nonnegative().default(0),
  vi4Rework: z.coerce.number().nonnegative().default(0)
});

const matrixDetailRowSchema = z.object({
  totalAccepted: z.coerce.number().nonnegative().default(0),
  vi02: z.coerce.number().nonnegative().default(0),
  vi03: z.coerce.number().nonnegative().default(0),
  vacuum: z.coerce.number().nonnegative().default(0),
  vi04: z.coerce.number().nonnegative().default(0),
  vi04Rework: z.coerce.number().nonnegative().default(0),
  rejection: z.coerce.number().nonnegative().default(0),
  output: z.coerce.number().nonnegative().default(0),
  yieldPercent: z.coerce.number().nonnegative().default(0)
});

const matrixQcSummarySchema = z
  .object({
    totalOutputForQc: z.coerce.number().nonnegative().optional(),
    qcConsumed: z.coerce.number().nonnegative().default(0),
    qcRetained: z.coerce.number().nonnegative().default(0),
    dispatchQuantity: z.coerce.number().nonnegative().default(0)
  })
  .optional();

const matrixStageDataSchema = z.object({
  cartridgeType: z.enum(["NC", "L", "LR", "UNKNOWN"]),
  line: z.enum(lines),
  materialTotals: matrixMaterialTotalsSchema,
  inlineChildParts: matrixInlineChildPartsSchema,
  auxiliaryTotals: z
    .object({
      aluminumFoil: z
        .object({
          totalQuantity: z.coerce.number().default(0),
          leftoverQuantity: z.coerce.number().default(0)
        })
        .optional(),
      flurosiliconOil: z
        .object({
          totalQuantity: z.coerce.number().default(0),
          leftoverQuantity: z.coerce.number().default(0)
        })
        .optional()
    })
    .optional(),
  rejectionStages: matrixRejectionStagesSchema,
  detailRows: z.array(matrixDetailRowSchema),
  totals: z
    .object({
      totalAccepted: z.coerce.number().nonnegative().optional(),
      totalOutput: z.coerce.number().nonnegative().optional(),
      totalRejections: z.coerce.number().nonnegative().optional(),
      matrixInput: z.coerce.number().nonnegative().optional(),
      pouchOutput: z.coerce.number().nonnegative().optional(),
      remainingForNextStage: z.coerce.number().nonnegative().optional()
    })
    .optional(),
  qcSummary: matrixQcSummarySchema
});

export const createBatchClosureSchema = z
  .object({
    stageType: z.enum(stageTypeValues),
    batchNumber: z
      .string()
      .length(10, "batchNumber must be exactly 10 characters")
      .regex(/^[A-Z0-9]+$/, "batchNumber must be alphanumeric uppercase"),
    line: z.enum(lines),
    lotLabel: z.string().optional(),
    lotNumber: z.coerce.number().int().nonnegative().optional(),
    closureGivenBy: z.string().min(1, "closureGivenBy is required"),
    shift: z.enum(shifts),
    productionDate: z
      .string()
      .regex(/\d{4}-\d{2}-\d{2}/, "productionDate must be in YYYY-MM-DD format"),
    status: z.string().optional(),
    totalAccepted: z.coerce.number().int().nonnegative().optional(),
    totalAnnealing: z.coerce.number().int().nonnegative().optional(),
    lineClearanceDateTime: z.string().optional(),
    lineClosureTime: z.string().optional(),
    batchQuantity: z.coerce.number().int().nonnegative().optional(),
    totalRejections: z.coerce.number().int().nonnegative().optional(),
    dumpTotalRejections: z.coerce.number().int().nonnegative().optional(),
    remarks: z.string().optional(),
    componentSummary: z
      .object({
        filterRod: componentTotalsSchema,
        dump2: componentTotalsSchema,
        sampleFilter: componentTotalsSchema
      })
      .optional(),
    detailRows: z.array(dumpDetailRowSchema).default([]),
    detailTotals: z
      .object({
        dumpInsertion: z.coerce.number().nonnegative().optional(),
        acceptedOutput: z.coerce.number().nonnegative().optional(),
        rejections: z.coerce.number().nonnegative().optional(),
        annealing: z.coerce.number().nonnegative().optional(),
        remainingForNextStage: z.coerce.number().nonnegative().optional(),
        batchInput: z.coerce.number().nonnegative().optional()
      })
      .optional(),
    flowSummary: flowSummarySchema,
    stageData: matrixStageDataSchema.optional()
  })
  .superRefine((data, ctx) => {
    if (data.stageType === "DumpToAnnealing") {
      if (!data.componentSummary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "componentSummary is required for Dump to Annealing stage",
          path: ["componentSummary"]
        });
      }
    }

    if (data.stageType === "MatrixToPouch") {
      if (!data.stageData) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "stageData is required for Matrix to Pouch stage",
          path: ["stageData"]
        });
      }
    }
  });

export const updateQcSummarySchema = z.object({
  qcConsumed: z.coerce.number().nonnegative(),
  qcRetained: z.coerce.number().nonnegative(),
  totalOutput: z.coerce.number().nonnegative().optional()
});
