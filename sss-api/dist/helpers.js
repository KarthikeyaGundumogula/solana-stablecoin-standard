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
    console.error(`[ERROR] ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
}
