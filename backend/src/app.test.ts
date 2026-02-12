import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./index";

describe("Backend API", () => {
  it("should return 200 OK for health check", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("should return 401 for unauthorized access to /me", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});
