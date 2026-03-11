import type { Request, Response, NextFunction } from "express";

export function ok(res: Response, data: object) {
  res.json({ success: true, ...data });
}

export function err(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, error: message });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Global error middleware
export function errorMiddleware(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.log(error);
  console.error(`[ERROR] ${error.message}`);

  // Catch Solana SendTransactionError and print logs
  const logs = (error as any)?.logs ?? (error as any)?.transactionLogs;
  if (logs) {
    console.error("[LOGS]", logs);
  }

  // Also try getLogs() if available
  if (typeof (error as any).getLogs === "function") {
    (error as any)
      .getLogs()
      .then((l: string[]) => {
        console.error("[SIMULATION LOGS]", l);
      })
      .catch(() => {});
  }

  res
    .status(500)
    .json({ success: false, error: error.message, logs: logs ?? [] });
}
