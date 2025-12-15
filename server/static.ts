import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // في الإنتاج، ملفات البناء في dist/public
  // في esbuild CommonJS، __dirname متاح تلقائياً من الملف المترجم
  // نستخدم require.resolve للحصول على المسار الحالي في CommonJS
  let distPath: string;
  
  try {
    // في CommonJS (بعد esbuild)، __dirname متاح
    // @ts-expect-error - __dirname متاح في CommonJS بعد esbuild
    distPath = path.resolve(__dirname, "public");
  } catch {
    // في ESM (التطوير)، نستخدم process.cwd()
    distPath = path.resolve(process.cwd(), "dist", "public");
  }
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
