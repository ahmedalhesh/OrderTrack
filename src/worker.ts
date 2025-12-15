import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerWorkerRoutes } from "../server/routes-worker";

type Env = {
  DB: D1Database;
  SESSION_SECRET?: string;
};

type Variables = {
  user?: { id: number; username: string };
  customer?: { id: number; accountNumber: string };
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Register all routes
registerWorkerRoutes(app);

export default app;

