import { mapExternalError } from "../utils/errorMapper.js";

const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  if (err?.status) {
    return res.status(err.status).json({
      error: mapExternalError(err),
    });
  }

  return res.status(500).json({
    error: "Internal Server Error",
  });
};

export default errorHandler;