// Shared AQI classification helpers used across pages.
// Mirrors the breakpoints defined in Phase 1 (01_Problem_Statement.md)

export function categoryFor(aqi) {
  if (aqi <= 50) return { label: "Good", tone: "good" };
  if (aqi <= 100) return { label: "Moderate", tone: "warn" };
  if (aqi <= 150) return { label: "Unhealthy (SG)", tone: "warn" };
  if (aqi <= 200) return { label: "Unhealthy", tone: "danger" };
  if (aqi <= 300) return { label: "Very Unhealthy", tone: "danger" };
  return { label: "Hazardous", tone: "danger" };
}

export function adviceFor(aqi) {
  if (aqi <= 50) return "Air quality is good. Enjoy normal outdoor activity.";
  if (aqi <= 100) return "Acceptable air quality. Unusually sensitive people should consider limiting prolonged outdoor exertion.";
  if (aqi <= 150) return "Sensitive groups should reduce prolonged outdoor activity. Others can proceed as usual.";
  if (aqi <= 200) return "Everyone may begin to experience health effects. Consider wearing a mask outdoors.";
  if (aqi <= 300) return "Health alert: avoid outdoor exertion. Keep windows closed and use an air purifier if available.";
  return "Health emergency: avoid all outdoor activity. Wear an N95 mask if you must go outside.";
}
