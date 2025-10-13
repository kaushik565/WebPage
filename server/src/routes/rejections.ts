import { Router } from "express";
import type { RejectionEntry } from "@prisma/client";
import { prisma } from "../prisma.js";
import { bulkRejectionSchema, createRejectionSchema, idParamSchema } from "../validation.js";
import { upload } from "../middleware/upload.js";
import { parseRejectionWorkbook } from "../services/rejection-import.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { line, shift, date } = req.query;

    const where: Record<string, unknown> = {};
    if (line && typeof line === "string") {
      where.line = line;
    }
    if (shift && typeof shift === "string") {
      where.shift = shift;
    }
    if (date && typeof date === "string") {
      where.entryDate = new Date(date);
    }

    const entries = await prisma.rejectionEntry.findMany({
      where,
      orderBy: { entryDate: "desc" }
    });

    res.json(entries.map(serializeEntry));
  } catch (error) {
    next(error);
  }
});

router.get("/batch-numbers", async (_req, res, next) => {
  try {
    const batches = await prisma.rejectionEntry.findMany({
      distinct: ["batchNo"],
      select: { batchNo: true },
      orderBy: { batchNo: "asc" }
    });
    res.json(batches.map((item) => item.batchNo));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const params = idParamSchema.parse(req.params);
    const entry = await prisma.rejectionEntry.findUnique({
      where: { id: params.id }
    });

    if (!entry) {
      return res.status(404).json({ message: "Rejection entry not found" });
    }

    res.json(serializeEntry(entry));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = createRejectionSchema.parse(req.body);

    const entry = await prisma.rejectionEntry.create({
      data: {
        entryDate: new Date(payload.entryDate),
        shift: payload.shift,
        batchNo: payload.batchNo,
        line: payload.line,
        stage: payload.stage,
        equipmentId: payload.equipmentId,
        rejectionType: payload.rejectionType,
        quantity: payload.quantity,
        updatedBy: payload.updatedBy
      }
    });

    res.status(201).json(serializeEntry(entry));
  } catch (error) {
    next(error);
  }
});

router.post("/bulk", async (req, res, next) => {
  try {
    const payload = bulkRejectionSchema.parse(req.body);

    const entries = await prisma.$transaction(
      payload.map((item) =>
        prisma.rejectionEntry.create({
          data: {
            entryDate: new Date(item.entryDate),
            shift: item.shift,
            batchNo: item.batchNo,
            line: item.line,
            stage: item.stage,
            equipmentId: item.equipmentId,
            rejectionType: item.rejectionType,
            quantity: item.quantity,
            updatedBy: item.updatedBy
          }
        })
      )
    );

    res.status(201).json(entries.map(serializeEntry));
  } catch (error) {
    next(error);
  }
});

router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Please attach an Excel file." });
    }

    const { entries, errors } = parseRejectionWorkbook(req.file.buffer);

    let saved: RejectionEntry[] = [];
    if (entries.length) {
      saved = await prisma.$transaction(
        entries.map((item) =>
          prisma.rejectionEntry.create({
            data: {
              entryDate: new Date(item.entryDate),
              shift: item.shift,
              batchNo: item.batchNo,
              line: item.line,
              stage: item.stage,
              equipmentId: item.equipmentId,
              rejectionType: item.rejectionType,
              quantity: item.quantity,
              updatedBy: item.updatedBy
            }
          })
        )
      );
    }

    const statusCode = saved.length ? 200 : 400;
    const message =
      saved.length && errors.length
        ? "Imported with some row errors."
        : saved.length
        ? "Import completed successfully."
        : "No rows imported. Please review errors.";

    res.status(statusCode).json({
      message,
      inserted: saved.length,
      errors,
      entries: saved.map(serializeEntry)
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const params = idParamSchema.parse(req.params);
    const payload = createRejectionSchema.parse(req.body);

    const entry = await prisma.rejectionEntry.update({
      where: { id: params.id },
      data: {
        entryDate: new Date(payload.entryDate),
        shift: payload.shift,
        batchNo: payload.batchNo,
        line: payload.line,
        stage: payload.stage,
        equipmentId: payload.equipmentId,
        rejectionType: payload.rejectionType,
        quantity: payload.quantity,
        updatedBy: payload.updatedBy
      }
    });

    res.json(serializeEntry(entry));
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const params = idParamSchema.parse(req.params);
    await prisma.rejectionEntry.delete({
      where: { id: params.id }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

function serializeEntry(entry: RejectionEntry) {
  return {
    id: entry.id,
    entryDate: entry.entryDate.toISOString().slice(0, 10),
    shift: entry.shift,
    batchNo: entry.batchNo,
    line: entry.line,
    stage: entry.stage,
    equipmentId: entry.equipmentId,
    rejectionType: entry.rejectionType,
    quantity: entry.quantity,
    updatedBy: entry.updatedBy,
    createdAt: entry.createdAt?.toISOString?.() ?? entry.createdAt,
    updatedAt: entry.updatedAt?.toISOString?.() ?? entry.updatedAt
  };
}

export default router;
