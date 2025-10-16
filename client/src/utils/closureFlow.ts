import type { BatchClosure, MatrixStageData } from "../api.ts";

export type AggregatedFlowRow = {
  batchNumber: string;
  initialBatchQuantity: number;
  dumpRejections: number;
  matrixInput: number;
  matrixRejections: number;
  pouchOutput: number;
  qcConsumed: number;
  qcRetained: number;
  dispatchQuantity: number | null;
  latestProductionDate?: string;
  qcPending: boolean;
};

const toNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

type AggregatedAccumulator = AggregatedFlowRow & {
  matrixLotCount: number;
  qcCompletedCount: number;
};

const ensureEntry = (map: Map<string, AggregatedAccumulator>, batchNumber: string): AggregatedAccumulator => {
  if (!map.has(batchNumber)) {
    map.set(batchNumber, {
      batchNumber,
      initialBatchQuantity: 0,
      dumpRejections: 0,
      matrixInput: 0,
      matrixRejections: 0,
      pouchOutput: 0,
      qcConsumed: 0,
      qcRetained: 0,
      dispatchQuantity: 0,
      latestProductionDate: undefined,
      qcPending: false,
      matrixLotCount: 0,
      qcCompletedCount: 0
    });
  }
  return map.get(batchNumber)!;
};

export const hasQcDetails = (summary: any | null | undefined): boolean => {
  if (!summary) return false;
  return (
    summary.qcConsumed !== undefined ||
    summary.qcRetained !== undefined ||
    summary.dispatchQuantity !== undefined
  );
};

export const aggregateClosuresByBatch = (closures: BatchClosure[]): AggregatedFlowRow[] => {
  const map = new Map<string, AggregatedAccumulator>();

  closures.forEach((closure) => {
    const entry = ensureEntry(map, closure.batchNumber);
    const productionDate = closure.productionDate ?? undefined;
    if (productionDate && (!entry.latestProductionDate || productionDate > entry.latestProductionDate)) {
      entry.latestProductionDate = productionDate;
    }

    if (closure.stageType === "DumpToAnnealing") {
      const initialQuantity = Math.max(
        entry.initialBatchQuantity,
        toNumber(closure.flowSummary?.initialBatchQuantity ?? closure.batchQuantity)
      );
      entry.initialBatchQuantity = initialQuantity;
      entry.dumpRejections += toNumber(
        closure.flowSummary?.dumpRejections ?? closure.dumpTotalRejections ?? closure.totalRejections
      );
      const remaining = Math.max(initialQuantity - entry.dumpRejections, 0);
      entry.matrixInput = Math.max(entry.matrixInput, remaining);
      return;
    }

    if (closure.stageType === "MatrixToPouch") {
      const stageData = (closure.stageData ?? null) as MatrixStageData | null;
      const totals = stageData?.totals;
      entry.matrixLotCount += 1;
      entry.matrixInput = Math.max(
        entry.matrixInput,
        toNumber(closure.flowSummary?.matrixInput ?? totals?.matrixInput ?? closure.batchQuantity)
      );
      entry.matrixRejections += toNumber(
        closure.flowSummary?.matrixRejections ?? totals?.totalRejections ?? closure.totalRejections
      );
      const pouchOutput = toNumber(
        closure.flowSummary?.pouchOutput ?? totals?.pouchOutput ?? totals?.totalOutput ?? closure.totalAnnealing
      );
      entry.pouchOutput += pouchOutput;
      const qcSummary = stageData?.qcSummary ?? null;
      const flowSummary = closure.flowSummary ?? null;
      const summaryForQc = hasQcDetails(qcSummary) ? qcSummary : hasQcDetails(flowSummary) ? flowSummary : null;

      if (summaryForQc) {
        entry.qcCompletedCount += 1;
        const qcConsumed = toNumber(summaryForQc.qcConsumed);
        const qcRetained = toNumber(summaryForQc.qcRetained);
        entry.qcConsumed += qcConsumed;
        entry.qcRetained += qcRetained;
        const dispatchQuantity =
          toNumber(summaryForQc.dispatchQuantity) || Math.max(pouchOutput - qcConsumed - qcRetained, 0);
        entry.dispatchQuantity += dispatchQuantity;
      }
    }
  });

  return Array.from(map.values())
    .filter((entry) => entry.matrixLotCount > 0)
    .map((entry) => {
      const matrixInput = entry.matrixInput || Math.max(entry.initialBatchQuantity - entry.dumpRejections, 0);
      const qcPending = entry.matrixLotCount > 0 && entry.qcCompletedCount < entry.matrixLotCount;
      const qcConsumed = qcPending ? 0 : entry.qcConsumed;
      const qcRetained = qcPending ? 0 : entry.qcRetained;
      const dispatchQuantity = qcPending ? null : entry.dispatchQuantity;

      return {
        batchNumber: entry.batchNumber,
        initialBatchQuantity: entry.initialBatchQuantity,
        dumpRejections: entry.dumpRejections,
        matrixInput,
        matrixRejections: entry.matrixRejections,
        pouchOutput: entry.pouchOutput,
        qcConsumed,
        qcRetained,
        dispatchQuantity,
        latestProductionDate: entry.latestProductionDate,
        qcPending
      } satisfies AggregatedFlowRow;
    })
    .sort((a, b) => (b.latestProductionDate ?? "").localeCompare(a.latestProductionDate ?? ""));
};
