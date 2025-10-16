import axios from "axios";

export const api = axios.create({
  baseURL: "/api"
});

export type RejectionFormData = {
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

export type RejectionEntry = RejectionFormData & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type LookupData = {
  lines: string[];
  shifts: string[];
  stages: string[];
  updatedBy: string[];
  stageRejectionTypes: Record<string, string[]>;
  lineEquipments: Record<string, string[]>;
};

export type DailyRejectionSummary = {
  date: string;
  shift: string;
  line: string;
  totalQuantity: number;
};

export type StageBreakdown = {
  stage: string;
  totalQuantity: number;
};

export type BatchSummary = {
  batchNo: string;
  totalQuantity: number;
  totalRecords: number;
  stageBreakdown: StageBreakdown[];
};

export type ComponentTotals = {
  totalQuantity: number;
  leftoverQuantity: number;
  inlineChildRejections?: number;
};

export type BatchClosureDetailRow = {
  dumpInsertion: number;
  acceptedOutput: number;
  rejections: number;
  annealing: number;
};

export type MatrixDetailRow = {
  totalAccepted: number;
  vi02: number;
  vi03: number;
  vacuum: number;
  vi04: number;
  vi04Rework: number;
  rejection: number;
  output: number;
  yieldPercent: number;
};

export type MatrixQcSummary = {
  totalOutputForQc?: number;
  qcConsumed: number;
  qcRetained: number;
  dispatchQuantity: number;
};

export type BatchFlowSummary = {
  initialBatchQuantity?: number;
  dumpRejections?: number;
  remainingForMatrix?: number;
  remainingForNextStage?: number;
  matrixInput?: number;
  matrixRejections?: number;
  pouchOutput?: number;
  qcConsumed?: number;
  qcRetained?: number;
  dispatchQuantity?: number;
};

export type MatrixStageData = {
  cartridgeType: "NC" | "L" | "LR" | "UNKNOWN";
  line: string;
  materialTotals: {
    matrix: ComponentTotals;
    rightValveCap: ComponentTotals;
    assembledSmiley: ComponentTotals;
    leftValveCap: ComponentTotals;
    bufferCap: ComponentTotals;
  };
  inlineChildParts: {
    matrix: number;
    assembledSmiley: number;
    leftValveCap: number;
    rightValveCap: number;
    bufferCap: number;
  };
  auxiliaryTotals?: {
    aluminumFoil?: ComponentTotals;
    flurosiliconOil?: ComponentTotals;
  };
  rejectionStages: {
    vi2: number;
    vi3: number;
    vacuum: number;
    vi4: number;
    vi4Rework: number;
  };
  detailRows: MatrixDetailRow[];
  totals?: {
    totalAccepted?: number;
    totalOutput?: number;
    totalRejections?: number;
    matrixInput?: number;
    pouchOutput?: number;
    remainingForNextStage?: number;
  };
  qcSummary?: MatrixQcSummary;
};

export type BatchClosurePayload = {
  stageType: "DumpToAnnealing" | "MatrixToPouch";
  batchNumber: string;
  line: string;
  lotLabel?: string;
  lotNumber?: number;
  closureGivenBy: string;
  shift: string;
  productionDate: string; // YYYY-MM-DD
  status?: string;
  totalAccepted?: number;
  totalAnnealing?: number;
  lineClearanceDateTime?: string;
  lineClosureTime?: string;
  batchQuantity?: number;
  totalRejections?: number;
  dumpTotalRejections?: number;
  remarks?: string;
  componentSummary?: {
    filterRod: ComponentTotals;
    dump2: ComponentTotals;
    sampleFilter: ComponentTotals;
  } | null;
  detailRows?: BatchClosureDetailRow[];
  detailTotals?: {
    dumpInsertion?: number;
    acceptedOutput?: number;
    rejections?: number;
    annealing?: number;
    remainingForNextStage?: number;
    batchInput?: number;
  };
  flowSummary?: BatchFlowSummary | null;
  stageData?: MatrixStageData | null;
};

export type BatchClosure = BatchClosurePayload & {
  id: number;
  createdAt: string;
  updatedAt: string;
  detailRows?: BatchClosureDetailRow[] | null;
  flowSummary?: BatchFlowSummary | null;
};

export type UpdateQcSummaryPayload = {
  qcConsumed: number;
  qcRetained: number;
  totalOutput?: number;
};

export type UploadError = {
  row: number;
  message: string;
};

export type UploadResponse = {
  message: string;
  inserted: number;
  errors: UploadError[];
  entries: RejectionEntry[];
};

export const fetchLookups = async () => {
  const { data } = await api.get<LookupData>("/lookups");
  return data;
};

export const createRejectionEntry = async (payload: RejectionFormData) => {
  const { data } = await api.post<RejectionEntry>("/rejections", payload);
  return data;
};

export const createRejectionEntriesBulk = async (payload: RejectionFormData[]) => {
  const { data } = await api.post<RejectionEntry[]>("/rejections/bulk", payload);
  return data;
};

export const fetchRejections = async () => {
  const { data } = await api.get<RejectionEntry[]>("/rejections");
  return data;
};

export const fetchDailySummary = async (params?: { startDate?: string; endDate?: string }) => {
  const { data } = await api.get<DailyRejectionSummary[]>("/reports/rejections/daily", {
    params
  });
  return data;
};

export const fetchBatchNumbers = async () => {
  const { data } = await api.get<string[]>("/rejections/batch-numbers");
  return data;
};

export const fetchBatchSummary = async (batchNo: string) => {
  const { data } = await api.get<BatchSummary>("/reports/rejections/by-batch", {
    params: { batchNo }
  });
  return data;
};

export const fetchBatchClosures = async () => {
  const { data } = await api.get<BatchClosure[]>("/batch-closures");
  return data;
};

export const updateMatrixQcSummary = async (id: number, payload: UpdateQcSummaryPayload) => {
  const { data } = await api.patch<BatchClosure>(`/batch-closures/${id}/qc`, payload);
  return data;
};

export const createBatchClosure = async (payload: BatchClosurePayload) => {
  const { data } = await api.post<BatchClosure>("/batch-closures", payload);
  return data;
};

export const uploadRejectionsExcel = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<UploadResponse>("/rejections/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};
