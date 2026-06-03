import { getReportsOverview } from "../../models/reports/reports.model.js";

export async function showReportsOverview() {
  return {
    code: 200,
    status: "success",
    data: await getReportsOverview(),
  };
}
