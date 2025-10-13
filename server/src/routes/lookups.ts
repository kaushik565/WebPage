import { Router } from "express";
import {
  lineEquipments,
  lines,
  stageRejectionTypes,
  stages,
  shifts,
  updatedByList
} from "../lookup-data.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    lines,
    shifts,
    stages,
    updatedBy: updatedByList,
    stageRejectionTypes,
    lineEquipments
  });
});

export default router;
