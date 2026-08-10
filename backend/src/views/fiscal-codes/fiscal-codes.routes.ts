import { Router } from "express";
import {
  indexCestOptions,
  indexNcmOptions,
} from "../../controllers/fiscal-codes/fiscal-codes.controller.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { parseStringFilter } from "../../shared/http/query-params.js";

export const fiscalCodesRoutes = Router();

fiscalCodesRoutes.get("/fiscal/ncm-options", (request, response) => {
  response
    .status(200)
    .json(indexNcmOptions(parseStringFilter(request.query.search)));
});

fiscalCodesRoutes.get("/fiscal/cest-options", async (request, response) => {
  const result = await indexCestOptions(
    requireActiveBranchId(response.locals),
    parseStringFilter(request.query.search),
  );

  response.status(200).json(result);
});
