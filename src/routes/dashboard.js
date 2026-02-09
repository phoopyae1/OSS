import { Router } from "express";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { overallStatus, groupServices } from "../lib/status.js";

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Please log in to access the dashboard.");
    return res.redirect("/login");
  }
  return next();
};

const renderMarkdown = (value) => {
  const raw = marked.parse(value || "");
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt"]
    }
  });
};

export default function dashboardRoutes({ prisma }) {
  const router = Router();

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }]
      });

      const now = new Date();
      const activeAnnouncements = await prisma.announcement.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
          ]
        },
        orderBy: { startsAt: "desc" }
      });

      const recentThreshold = new Date();
      recentThreshold.setDate(recentThreshold.getDate() - 30);
      const recentAnnouncements = await prisma.announcement.findMany({
        where: {
          createdAt: { gte: recentThreshold }
        },
        orderBy: { createdAt: "desc" }
      });

      const statusCounts = services.reduce((acc, service) => {
        acc.total += 1;
        acc[service.status] = (acc[service.status] || 0) + 1;
        return acc;
      }, {
        total: 0
      });

      const downServices = services.filter((service) =>
        ["PARTIAL_OUTAGE", "MAJOR_OUTAGE"].includes(service.status)
      );
      const attentionServices = services.filter((service) => service.status !== "OPERATIONAL");

      res.render("dashboard/index", {
        title: "Dashboard",
        overallStatus: overallStatus(services),
        groupedServices: groupServices(services),
        statusCounts,
        downServices,
        attentionServices,
        activeAnnouncements: activeAnnouncements.map((announcement) => ({
          ...announcement,
          html: renderMarkdown(announcement.body)
        })),
        recentAnnouncements: recentAnnouncements.map((announcement) => ({
          ...announcement,
          html: renderMarkdown(announcement.body)
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
