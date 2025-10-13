import XLSX from "xlsx";
import { format } from "date-fns";
import {
  lines,
  lineEquipments,
  stageRejectionTypes,
  stages,
  shifts,
  updatedByList
} from "../lookup-data.js";
import { createRejectionSchema } from "../validation.js";

type RowRecord = Record<string, unknown>;

type ParseResult = {
  entries: Array<{
    entryDate: string;
    shift: string;
    batchNo: string;
    line: string;
    stage: string;
    equipmentId: string;
    rejectionType: string;
    quantity: number;
    updatedBy: string;
  }>;
  errors: Array<{ row: number; message: string }>;
};

const REQUIRED_COLUMNS = [
  "Date",
  "Shift",
  "BatchNo",
  "Line",
  "Stage",
  "EquipmentId",
  "RejectionType",
  "Quantity",
  "UpdatedBy"
];

const toLowerMap = (list: readonly string[]) =>
  new Map(list.map((item) => [item.toLowerCase(), item]));

const lineMap = toLowerMap(lines);
const shiftMap = toLowerMap(shifts);
const stageMap = toLowerMap(stages);
const updatedByMap = toLowerMap(updatedByList);

export function parseRejectionWorkbook(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellNF: false,
    cellText: false
  });

  if (!workbook.SheetNames.length) {
    return { entries: [], errors: [{ row: 0, message: "Workbook does not contain any sheets." }] };
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const headerMatrix = XLSX.utils.sheet_to_json<Array<string | number | Date>>(sheet, {
    header: 1,
    defval: ""
  });

  if (!headerMatrix.length) {
    return { entries: [], errors: [{ row: 0, message: "Sheet is empty." }] };
  }

  const headerRow = headerMatrix[0] ?? [];
  const headerKeys = headerRow.map((value) => String(value ?? "").trim());

  if (!hasRequiredColumns(headerKeys)) {
    const missing = REQUIRED_COLUMNS.filter(
      (required) => !headerKeys.some((header) => header.toLowerCase() === required.toLowerCase())
    );
    return {
      entries: [],
      errors: [
        {
          row: 0,
          message: `Missing required columns: ${missing.join(", ")}`
        }
      ]
    };
  }

  const sheetRows = XLSX.utils.sheet_to_json<RowRecord>(sheet, {
    defval: "",
    raw: false
  });

  const results: ParseResult = { entries: [], errors: [] };

  sheetRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // account for header row
    try {
      const record = buildRecord(row);
      const parseResult = createRejectionSchema.safeParse(record);
      if (!parseResult.success) {
        const reason = parseResult.error.errors.map((error) => error.message).join("; ");
        results.errors.push({ row: rowNumber, message: reason || "Invalid data" });
        return;
      }
      results.entries.push(parseResult.data);
    } catch (error) {
      results.errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Unknown parsing error"
      });
    }
  });

  return results;
}

function hasRequiredColumns(headers: string[]): boolean {
  return REQUIRED_COLUMNS.every((required) =>
    headers.some((header) => header.toLowerCase() === required.toLowerCase())
  );
}

function buildRecord(row: RowRecord) {
  const getValue = (key: string): string => {
    const foundKey = Object.keys(row).find((column) => column.toLowerCase() === key.toLowerCase());
    if (!foundKey) {
      return "";
    }
    return String(row[foundKey] ?? "").trim();
  };

  const rawDate = getValue("Date");
  const entryDate = convertDate(rawDate);

  const shift = resolveValue(getValue("Shift"), shiftMap, "shift");
  const line = resolveValue(getValue("Line"), lineMap, "line");
  const stage = resolveValue(getValue("Stage"), stageMap, "stage");

  const batchNoRaw = getValue("BatchNo");
  const batchNo = batchNoRaw.toUpperCase();
  if (batchNo.length !== 10) {
    throw new Error("BatchNo must be exactly 10 characters");
  }
  const updatedBy = resolveValue(getValue("UpdatedBy"), updatedByMap, "updated by");

  const rejectionType = resolveRejectionType(stage, getValue("RejectionType"));
  const quantity = Number.parseInt(getValue("Quantity"), 10);

  if (Number.isNaN(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive number");
  }

  let equipmentId = getValue("EquipmentId");
  if (stage === "VI-1") {
    const allowedEquipment = lineEquipments[line as keyof typeof lineEquipments] ?? [];
    const matchedEquipment = allowedEquipment.find(
      (equipment) => equipment.toLowerCase() === equipmentId.toLowerCase()
    );
    if (!matchedEquipment) {
      throw new Error(
        `Equipment must be one of: ${allowedEquipment.join(", ")} for line ${line} and stage ${stage}`
      );
    }
    equipmentId = matchedEquipment;
  } else {
    equipmentId = "NA";
  }

  return {
    entryDate,
    shift,
    batchNo,
    line,
    stage,
    equipmentId,
    rejectionType,
    quantity,
    updatedBy
  };
}

function convertDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Date is required");
  }

  // Excel may export as dd/MM/yyyy or ISO
  const segments = trimmed.split(/[\/\-]/);
  if (segments.length === 3) {
    const [part1, part2, part3] = segments;
    // assume dd/MM/yyyy
    const day = Number.parseInt(part1, 10);
    const month = Number.parseInt(part2, 10);
    const year = Number.parseInt(part3, 10);
    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      Number.isInteger(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      const date = new Date(year, month - 1, day);
      if (!Number.isNaN(date.getTime())) {
        return format(date, "yyyy-MM-dd");
      }
    }
  }

  const maybeNumber = Number(trimmed);
  if (!Number.isNaN(maybeNumber) && maybeNumber > 0) {
    const parsed = XLSX.SSF.parse_date_code(maybeNumber);
    if (parsed) {
      const date = new Date(parsed.y, parsed.m - 1, parsed.d);
      if (!Number.isNaN(date.getTime())) {
        return format(date, "yyyy-MM-dd");
      }
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, "yyyy-MM-dd");
  }

  throw new Error(`Unable to parse date "${value}". Expected dd/MM/yyyy`);
}

function resolveValue<T extends string>(
  value: string,
  lookup: Map<string, T>,
  label: string
): T {
  const normalized = value.trim().toLowerCase();
  const match = lookup.get(normalized);
  if (!match) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return match;
}

function resolveRejectionType(stage: string, value: string): string {
  const stageTypes = stageRejectionTypes[stage as keyof typeof stageRejectionTypes] ?? [];
  const normalized = value.trim().toLowerCase();
  const match = stageTypes.find((type) => type.toLowerCase() === normalized);
  if (!match) {
    throw new Error(`Invalid rejection type "${value}" for stage ${stage}`);
  }
  return match;
}
