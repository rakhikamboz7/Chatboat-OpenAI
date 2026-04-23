export function mapExternalError(err) {
  switch (err.status) {
    case 400:
      return "Invalid request to AI service.";
    case 401:
      return "Unauthorized API request.";
    case 403:
      return "Access denied or quota exceeded.";
    case 429:
      return "Too many requests. Please try again later.";
    case 500:
      return "AI service error. Try again.";
    default:
      return "Unexpected AI error.";
  }
}