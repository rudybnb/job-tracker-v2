import { Router } from "express";

const router = Router();

/**
 * Health check endpoint for Render and monitoring services
 */
router.get("/health", async (req, res) => {
  try {
    // Check database connection
    const { getDb } = await import("./db");
    const db = await getDb();
    
    if (!db) {
      return res.status(503).json({
        status: "unhealthy",
        message: "Database not available",
        timestamp: new Date().toISOString(),
      });
    }

    // Simple query to verify database is responsive
    await db.execute("SELECT 1");

    res.json({
      status: "healthy",
      message: "Job Tracker is running",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error("[Health Check] Error:", error);
    res.status(503).json({
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
