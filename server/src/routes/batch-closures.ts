import { Router } from "express";
import { prisma } from "../prisma.js";
import {
  createBatchClosureSchema,
  idParamSchema,
  updateQcSummarySchema
} from "../validation.js";

type FlowSummary = Record<string, number> | null;

let supportsFlowSummaryColumn: boolean | null = null;

const ensureFlowSummarySupport = async () => {
  if (supportsFlowSummaryColumn !== null) {
    return supportsFlowSummaryColumn;
  }

  try {
    const tableInfo = (await prisma.$queryRawUnsafe<any[]>("PRAGMA table_info('batch_closures')")) ?? [];
    supportsFlowSummaryColumn = tableInfo.some((column) => column?.name === "flow_summary");
  } catch (error) {
    console.error("Unable to determine flow_summary column support", error);
    supportsFlowSummaryColumn = false;
  }

  return supportsFlowSummaryColumn;
};

const normaliseDetailTotals = (detailTotals: any, detailRows: Array<any>) => {
  if (detailTotals) {
    return detailTotals;
  }

  if (!detailRows.length) {
    return null;
  }

  return detailRows.reduce(
    (acc, row) => ({
      dumpInsertion: (acc.dumpInsertion ?? 0) + Number(row.dumpInsertion ?? 0),
      acceptedOutput: (acc.acceptedOutput ?? 0) + Number(row.acceptedOutput ?? 0),
      rejections: (acc.rejections ?? 0) + Number(row.rejections ?? 0),
      annealing: (acc.annealing ?? 0) + Number(row.annealing ?? 0)
    }),
    { dumpInsertion: 0, acceptedOutput: 0, rejections: 0, annealing: 0 }
  );
};

const computeFlowSummaryForPayload = (
  payload: any,
  detailTotals: any,
  stageData: any
): FlowSummary => {
  const pseudoClosure = {
    stageType: payload.stageType,
    batchQuantity:
      payload.batchQuantity ?? detailTotals?.batchInput ?? payload.flowSummary?.initialBatchQuantity ?? null,
    totalRejections: payload.totalRejections ?? null,
    dumpTotalRejections: payload.dumpTotalRejections ?? null,
    totalAnnealing: payload.totalAnnealing ?? null
  };

  return computeFlowSummary(pseudoClosure, detailTotals, stageData, payload.flowSummary ?? null);
};

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const closures = await prisma.batchClosure.findMany({
      orderBy: { productionDate: "desc" }
    });
    res.json(closures.map(serializeClosure));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const params = idParamSchema.parse(req.params);
    const closure = await prisma.batchClosure.findUnique({
      where: { id: params.id }
    });
    if (!closure) {
      return res.status(404).json({ message: "Batch closure not found" });
    }
    res.json(serializeClosure(closure));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = createBatchClosureSchema.parse(req.body);

    const parsedDetailRows = (payload.detailRows ?? []).filter((row: any) => {
      const numericValues = [row.dumpInsertion, row.acceptedOutput, row.rejections, row.annealing];
      return numericValues.some((value) => value && value !== 0);
    });

    const detailTotals = normaliseDetailTotals(payload.detailTotals ?? null, parsedDetailRows);
    const stageData = payload.stageData ?? null;
    const flowSummaryForStorage = computeFlowSummaryForPayload(payload, detailTotals, stageData);
    const shouldPersistFlowSummary = await ensureFlowSummarySupport();

    const createData: Record<string, unknown> = {
      stageType: payload.stageType,
      batchNumber: payload.batchNumber,
      lotLabel: payload.lotLabel,
      lotNumber: payload.lotNumber ?? null,
      closureGivenBy: payload.closureGivenBy,
      shift: payload.shift,
      productionDate: new Date(payload.productionDate),
      status: payload.status,
      totalAccepted: payload.totalAccepted ?? null,
      totalAnnealing: payload.totalAnnealing ?? null,
      lineClearanceDateTime: payload.lineClearanceDateTime ? new Date(payload.lineClearanceDateTime) : null,
      lineClosureTime: payload.lineClosureTime,
      batchQuantity: payload.batchQuantity ?? null,
      totalRejections: payload.totalRejections ?? null,
      dumpTotalRejections: payload.dumpTotalRejections ?? null,
      remarks: payload.remarks,
      componentSummary: payload.componentSummary ? JSON.stringify(payload.componentSummary) : null,
      detailRows: parsedDetailRows.length ? JSON.stringify(parsedDetailRows) : null,
      detailTotals: detailTotals ? JSON.stringify(detailTotals) : null,
      stageData: payload.stageData ? JSON.stringify(payload.stageData) : null
    };

    // Prisma Client in this repository was generated without the optional `line` field,
    // so we assign it dynamically to avoid type errors while still persisting the value.
    createData.line = payload.line ?? null;

    if (shouldPersistFlowSummary) {
      createData.flowSummary = flowSummaryForStorage ? JSON.stringify(flowSummaryForStorage) : null;
    }

    const closure = await prisma.batchClosure.create({
      data: createData as any
    });

    res.status(201).json(serializeClosure(closure));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/qc", async (req, res, next) => {
  try {
    const params = idParamSchema.parse(req.params);
    const payload = updateQcSummarySchema.parse(req.body);

    const closure = await prisma.batchClosure.findUnique({
      where: { id: params.id }
    });

    if (!closure) {
      return res.status(404).json({ message: "Batch closure not found" });
    }

    if (closure.stageType !== "MatrixToPouch") {
      return res.status(400).json({ message: "QC summary can only be updated for Matrix to Pouch stage" });
    }

    const stageData = closure.stageData ? JSON.parse(closure.stageData) : {};
    const totals = stageData?.totals ?? {};

    const totalOutput = Number(payload.totalOutput ?? totals.totalOutput ?? closure.totalAnnealing ?? 0);
    const qcConsumed = Number(payload.qcConsumed ?? 0);
    const qcRetained = Number(payload.qcRetained ?? 0);
    const dispatchQuantity = Math.max(totalOutput - qcConsumed - qcRetained, 0);

    const detailTotals = closure.detailTotals ? JSON.parse(closure.detailTotals) : null;
    const existingFlowSummary = parseJson((closure as any).flowSummary);
    const updatedFlowSummary = computeFlowSummary(
      { ...closure, totalAnnealing: totalOutput },
      detailTotals,
      stageData,
      existingFlowSummary
    );

    const updatedStageData = {
      ...stageData,
      totals: {
        ...totals,
        totalOutput,
        pouchOutput: totalOutput,
        remainingForNextStage: totalOutput
      },
      qcSummary: {
        totalOutputForQc: totalOutput,
        qcConsumed,
        qcRetained,
        dispatchQuantity
      }
    };

    const updateData: Record<string, unknown> = {
      totalAnnealing: totalOutput,
      stageData: JSON.stringify(updatedStageData)
    };

    if (await ensureFlowSummarySupport()) {
      updateData.flowSummary = updatedFlowSummary ? JSON.stringify(updatedFlowSummary) : null;
    }

    const updated = await prisma.batchClosure.update({
      where: { id: params.id },
      data: updateData as any
    });

    res.json(serializeClosure(updated));
  } catch (error) {
    next(error);
  }
});

export default router;

function serializeClosure(closure: any) {
  const componentSummary = parseJson(closure.componentSummary);
  if (componentSummary) {
    ["filterRod", "dump2", "sampleFilter"].forEach((key) => {
      if (componentSummary[key]) {
        componentSummary[key].inlineChildRejections = componentSummary[key].inlineChildRejections ?? 0;
      }
    });
  }
  const detailRows = parseJson(closure.detailRows);
  const detailTotals = parseJson(closure.detailTotals);
  const stageData = parseJson(closure.stageData);
  const persistedFlowSummary = parseJson((closure as any).flowSummary);
  const flowSummary = computeFlowSummary(closure, detailTotals, stageData, persistedFlowSummary);

  return {
    id: closure.id,
    stageType: closure.stageType,
    batchNumber: closure.batchNumber,
    lotLabel: closure.lotLabel,
    lotNumber: closure.lotNumber,
    line: closure.line ?? stageData?.line ?? "",
    closureGivenBy: closure.closureGivenBy,
    shift: closure.shift,
    productionDate:
      closure.productionDate instanceof Date ? closure.productionDate.toISOString().slice(0, 10) : closure.productionDate,
    status: closure.status,
    totalAccepted: closure.totalAccepted,
    totalAnnealing: closure.totalAnnealing,
    lineClearanceDateTime:
      closure.lineClearanceDateTime instanceof Date
        ? closure.lineClearanceDateTime.toISOString()
        : closure.lineClearanceDateTime,
    lineClosureTime: closure.lineClosureTime,
    batchQuantity: closure.batchQuantity,
    totalRejections: closure.totalRejections,
    dumpTotalRejections: closure.dumpTotalRejections,
    remarks: closure.remarks,
    componentSummary,
    detailRows,
    detailTotals,
    stageData,
    flowSummary,
    createdAt: closure.createdAt instanceof Date ? closure.createdAt.toISOString() : closure.createdAt,
    updatedAt: closure.updatedAt instanceof Date ? closure.updatedAt.toISOString() : closure.updatedAt
  };
}

function parseJson(value: unknown) {
  if (!value || typeof value !== "string") {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function computeFlowSummary(closure: any, detailTotals: any, stageData: any, existing?: any) {
  const summary: Record<string, number> = {};
  let hasValue = false;

  const assignIfPresent = (key: string, source: unknown) => {
    if (source === null || source === undefined) {
      return;
    }
    const numeric = Number(source);
    if (Number.isNaN(numeric)) {
      return;
    }
    summary[key] = numeric;
    hasValue = true;
  };

  if (existing && typeof existing === "object") {
    Object.entries(existing).forEach(([key, value]) => assignIfPresent(key, value));
  }

  const batchQuantity = closure.batchQuantity ?? detailTotals?.batchInput;
  assignIfPresent("initialBatchQuantity", batchQuantity);

  const dumpRejections =
    closure.dumpTotalRejections ?? closure.totalRejections ?? detailTotals?.rejections;
  assignIfPresent("dumpRejections", dumpRejections);

  if (closure.stageType === "DumpToAnnealing") {
    if (batchQuantity !== undefined || dumpRejections !== undefined) {
      const numericBatch = Number(batchQuantity ?? 0);
      const numericRejects = Number(dumpRejections ?? 0);
      if (Number.isFinite(numericBatch) && Number.isFinite(numericRejects)) {
        const remaining = Math.max(
          detailTotals?.remainingForNextStage ?? numericBatch - numericRejects,
          0
        );
        summary.remainingForMatrix = remaining;
        summary.matrixInput = remaining;
        hasValue = hasValue || remaining !== 0;
      }
    }
  }

  if (closure.stageType === "MatrixToPouch") {
    const totals = stageData?.totals ?? {};
    const matrixInput =
      totals?.matrixInput ?? closure.batchQuantity ?? detailTotals?.batchInput ?? null;
    assignIfPresent("matrixInput", matrixInput);
    if (matrixInput !== null && matrixInput !== undefined) {
      summary.remainingForMatrix = Number(matrixInput) || 0;
      hasValue = hasValue || Number(matrixInput) !== 0;
    }

    const matrixRejections = totals?.totalRejections ?? closure.totalRejections;
    assignIfPresent("matrixRejections", matrixRejections);

    const pouchOutput = totals?.pouchOutput ?? totals?.totalOutput ?? closure.totalAnnealing;
    assignIfPresent("pouchOutput", pouchOutput);
    if (pouchOutput !== null && pouchOutput !== undefined) {
      const numeric = Number(pouchOutput) || 0;
      summary.remainingForNextStage = numeric;
      hasValue = hasValue || numeric !== 0;
    }

    const qcSummary = stageData?.qcSummary ?? null;
    if (qcSummary) {
      assignIfPresent("qcConsumed", qcSummary.qcConsumed);
      assignIfPresent("qcRetained", qcSummary.qcRetained);
      if (
        qcSummary.dispatchQuantity !== undefined &&
        qcSummary.dispatchQuantity !== null
      ) {
        assignIfPresent("dispatchQuantity", qcSummary.dispatchQuantity);
      } else if (pouchOutput !== null && pouchOutput !== undefined) {
        const base = Number(pouchOutput) || 0;
        const consumed = Number(qcSummary.qcConsumed ?? 0);
        const retained = Number(qcSummary.qcRetained ?? 0);
        const dispatchQuantity = Math.max(base - consumed - retained, 0);
        summary.dispatchQuantity = dispatchQuantity;
        hasValue = true;
      }
    }
  }

  return hasValue ? summary : null;
}
