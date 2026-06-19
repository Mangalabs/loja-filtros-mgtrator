import { env } from "./env.js";
import { validateRuntimeConfiguration } from "./runtime-checks.js";

validateRuntimeConfiguration(env);

console.log("Production configuration looks valid.");
