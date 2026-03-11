export function ok(res, data) {
    res.json({ success: true, ...data });
}
export function err(res, message, status = 400) {
    res.status(status).json({ success: false, error: message });
}
export function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
// Global error middleware
export function errorMiddleware(error, _req, res, _next) {
    console.log(error);
    console.error(`[ERROR] ${error.message}`);
    // Catch Solana SendTransactionError and print logs
    const logs = error?.logs ?? error?.transactionLogs;
    if (logs) {
        console.error("[LOGS]", logs);
    }
    // Also try getLogs() if available
    if (typeof error.getLogs === "function") {
        error
            .getLogs()
            .then((l) => {
            console.error("[SIMULATION LOGS]", l);
        })
            .catch(() => { });
    }
    res
        .status(500)
        .json({ success: false, error: error.message, logs: logs ?? [] });
}
