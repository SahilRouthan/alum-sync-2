import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

const SPA_ROUTES = [
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "auth/callback",
  "student",
  "student/network",
  "student/alumni",
  "student/jobs",
  "student/mentor",
  "student/mentorship",
  "student/alerts",
  "student/profile",
  "student/resume",
  "student/recommendations",
  "student/messages",
  "student/events",
  "alumni",
  "alumni/network",
  "alumni/jobs",
  "alumni/mentor",
  "alumni/mentorship",
  "alumni/alerts",
  "alumni/profile",
  "alumni/messages",
  "alumni/events",
  "admin",
  "admin/network",
  "admin/jobs",
  "admin/mentor",
  "admin/alerts",
  "admin/profile",
  "admin/overview",
  "admin/alumni",
  "admin/students",
  "admin/import",
  "admin/moderation",
  "admin/messages",
  "admin/events",
];

function spaFallbackPlugin() {
  return {
    name: "alumsync-spa-static-entries",
    closeBundle() {
      const distDir = path.resolve(process.cwd(), "dist");
      const indexHtmlPath = path.join(distDir, "index.html");
      if (!fs.existsSync(indexHtmlPath)) return;

      const html = fs.readFileSync(indexHtmlPath, "utf8");
      fs.writeFileSync(path.join(distDir, "404.html"), html);

      for (const route of SPA_ROUTES) {
        const routeDir = path.join(distDir, route);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, "index.html"), html);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    spaFallbackPlugin(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
