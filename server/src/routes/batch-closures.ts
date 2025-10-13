import { Router } from "express";
import { prisma } from "../prisma.js";
import { createBatchClosureSchema, idParamSchema } from "../validation.js";

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

    const parsedDetailRows = (payload.detailRows ?? []).filter((row) => {
      const numericValues = [row.dumpInsertion, row.acceptedOutput, row.rejections, row.annealing];
      return numericValues.some((value) => value && value !== 0);
    });

    const closure = await prisma.batchClosure.create({
      data: {
        stageType: payload.stageType,
        batchNumber: payload.batchNumber,
        line: payload.line,
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
        detailTotals: payload.detailTotals ? JSON.stringify(payload.detailTotals) : null,
        stageData: payload.stageData ? JSON.stringify(payload.stageData) : null
      }
    });

    res.status(201).json(serializeClosure(closure));
  } catch (error) {
    next(error);
  }
});

export default router;

function serializeClosure(closure: any) {
  const componentSummary = closure.componentSummary ? JSON.parse(closure.componentSummary) : null;
  if (componentSummary) {
    ["filterRod", "dump2", "sampleFilter"].forEach((key) => {
      if (componentSummary[key]) {
        componentSummary[key].inlineChildRejections = componentSummary[key].inlineChildRejections ?? 0;
      }
    });
  }
  const detailRows = closure.detailRows ? JSON.parse(closure.detailRows) : null;
  const detailTotals = closure.detailTotals ? JSON.parse(closure.detailTotals) : null;
  const stageData = closure.stageData ? JSON.parse(closure.stageData) : null;

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
    createdAt: closure.createdAt instanceof Date ? closure.createdAt.toISOString() : closure.createdAt,
    updatedAt: closure.updatedAt instanceof Date ? closure.updatedAt.toISOString() : closure.updatedAt
  };
}
