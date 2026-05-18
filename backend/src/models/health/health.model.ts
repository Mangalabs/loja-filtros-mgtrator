export type HealthStatus = {
  status: "ok";
  service: string;
  checkedAt: string;
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "loja-filtros-backend",
    checkedAt: new Date().toISOString(),
  };
}
