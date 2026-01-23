import "express";

declare module "express-serve-static-core" {
  interface Request {
    /**
     * Active instance id for this request.
     * Set by server/middleware/instanceContext.ts
     */
    instanceId?: string;
  }
}
