import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import rejectionsRouter from "./routes/rejections.js";
import lookupsRouter from "./routes/lookups.js";
import reportsRouter from "./routes/reports.js";
import batchClosuresRouter from "./routes/batch-closures.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.ORIGIN?.split(",") ?? true
  })
);
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});

app.use("/api/lookups", lookupsRouter);
app.use("/api/rejections", rejectionsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/batch-closures", batchClosuresRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err.name === "ZodError") {
    return res.status(400).json({ message: "Validation failed", errors: err.errors });
  }
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
