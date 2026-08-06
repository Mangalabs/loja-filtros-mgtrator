import { Router } from "express";
import { indexNcmOptions } from "../../controllers/fiscal-codes/fiscal-codes.controller.js";
import { parseStringFilter } from "../../shared/http/query-params.js";

export const fiscalCodesRoutes = Router();

fiscalCodesRoutes.get("/fiscal/ncm-options", (request, response) => {
  response
    .status(200)
    .json(indexNcmOptions(parseStringFilter(request.query.search)));
});
