import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

router.get("/rejections/daily", async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where: { entryDate?: { gte?: Date; lte?: Date } } = {};

    if (startDate && typeof startDate === "string") {
      const parsed = new Date(startDate);
      if (!Number.isNaN(parsed.getTime())) {
        where.entryDate = { ...where.entryDate, gte: parsed };
      }
    }

    if (endDate && typeof endDate === "string") {
      const parsed = new Date(endDate);
      if (!Number.isNaN(parsed.getTime())) {
        where.entryDate = { ...where.entryDate, lte: parsed };
      }
    }

    const results = await prisma.rejectionEntry.groupBy({
      by: ["entryDate", "shift", "line"],
      where,
      _sum: { quantity: true },
      orderBy: [
        { entryDate: "desc" },
        { shift: "asc" },
        { line: "asc" }
      ]
    });

    const serialized = results.map((item) => ({
      date: item.entryDate instanceof Date ? item.entryDate.toISOString().slice(0, 10) : item.entryDate,
      shift: item.shift,
      line: item.line,
      totalQuantity: Number(item._sum.quantity ?? 0)
    }));

    res.json(serialized);
  } catch (error) {
    next(error);
  }
});

router.get("/rejections/by-batch", async (req, res, next) => {
  try {
    const { batchNo } = req.query;

    if (!batchNo || typeof batchNo !== "string" || !batchNo.trim()) {
      return res.status(400).json({ message: "batchNo query parameter is required" });
    }

    const normalizedBatchNo = batchNo.trim();

    const totalResult = await prisma.rejectionEntry.aggregate({
      where: { batchNo: normalizedBatchNo },
      _sum: { quantity: true },
      _count: { _all: true }
    });

    const stageResults = await prisma.rejectionEntry.groupBy({
      by: ["stage"],
      where: { batchNo: normalizedBatchNo },
      _sum: { quantity: true },
      orderBy: { stage: "asc" }
    });

    res.json({
      batchNo: normalizedBatchNo,
      totalQuantity: totalResult._sum.quantity ?? 0,
      totalRecords: totalResult._count._all,
      stageBreakdown: stageResults.map((item) => ({
        stage: item.stage,
        totalQuantity: item._sum.quantity ?? 0
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
