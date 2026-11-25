import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isSupabaseConfigured } from "./config/supabase.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import alumniRoutes from "./routes/alumni.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import mentorshipRoutes from "./routes/mentorship.routes.js";
import messagingRoutes from "./routes/messaging.routes.js";
import communityRoutes from "./routes/community.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import jobsRoutes from "./routes/jobs.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = Number(process.env.PORT || 5001);
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
].filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "AlumSync API",
    supabaseConfigured: isSupabaseConfigured,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/alumni", alumniRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/mentorship", mentorshipRoutes);
app.use("/api/messages", messagingRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`AlumSync backend running on http://localhost:${PORT}`);
    if (!isSupabaseConfigured) {
      console.warn(
        "[AlumSync] Supabase credentials not configured yet. Add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env"
      );
    }
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[AlumSync] Port ${PORT} is already in use. Stop the process using port ${PORT} or set PORT=5001 in server/.env (and VITE_API_BASE_URL=/api in .env).`
      );
      process.exit(1);
    }
    throw err;
  });
}

export default app;
