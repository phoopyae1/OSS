import { Router } from "express";
import { overallStatus } from "../lib/status.js";

const parseDateParam = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export default function apiRoutes({ prisma }) {
  const router = Router();

  router.get("/service-status", async (req, res, next) => {
    try {
      const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }]
      });
      res.json({
        generatedAt: new Date().toISOString(),
        overallStatus: overallStatus(services),
        services
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/notifications", async (req, res, next) => {
    try {
      const { active, from, to } = req.query;
      const filters = {};

      if (active === "true") {
        filters.isActive = true;
      } else if (active === "false") {
        filters.isActive = false;
      }

      const fromDate = parseDateParam(from);
      const toDate = parseDateParam(to);

      if (fromDate || toDate) {
        filters.createdAt = {};
        if (fromDate) {
          filters.createdAt.gte = fromDate;
        }
        if (toDate) {
          filters.createdAt.lte = toDate;
        }
      }

      const announcements = await prisma.announcement.findMany({
        where: filters,
        orderBy: { createdAt: "desc" }
      });

      res.json({
        generatedAt: new Date().toISOString(),
        count: announcements.length,
        announcements
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
