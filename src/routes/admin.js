import { Router } from "express";
import { z } from "zod";

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    req.flash("error", "Admin access required.");
    return res.redirect("/login");
  }
  return next();
};

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  status: z.enum([
    "OPERATIONAL",
    "DEGRADED",
    "PARTIAL_OUTAGE",
    "MAJOR_OUTAGE",
    "MAINTENANCE"
  ]),
  isActive: z.string().optional()
});

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.string().optional()
});

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const openApiSpec = `openapi: 3.0.0
info:
  title: OSS Support Portal API
  version: v1
servers:
  - url: https://your-render-url.onrender.com
paths:
  /api/service-status:
    get:
      summary: Current service status board
      responses:
        '200':
          description: Service status snapshot
          content:
            application/json:
              schema:
                type: object
                properties:
                  generatedAt:
                    type: string
                    format: date-time
                  overallStatus:
                    type: string
                    enum: [OPERATIONAL, DEGRADED, PARTIAL_OUTAGE, MAJOR_OUTAGE, MAINTENANCE]
                  services:
                    type: array
                    items:
                      $ref: '#/components/schemas/Service'
  /api/notifications:
    get:
      summary: Announcement feed
      parameters:
        - in: query
          name: active
          schema:
            type: boolean
        - in: query
          name: from
          schema:
            type: string
            format: date
        - in: query
          name: to
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Announcement payload
          content:
            application/json:
              schema:
                type: object
                properties:
                  generatedAt:
                    type: string
                    format: date-time
                  count:
                    type: integer
                  announcements:
                    type: array
                    items:
                      $ref: '#/components/schemas/Announcement'
components:
  schemas:
    Service:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
          nullable: true
        category:
          type: string
          nullable: true
        status:
          type: string
          enum: [OPERATIONAL, DEGRADED, PARTIAL_OUTAGE, MAJOR_OUTAGE, MAINTENANCE]
        isActive:
          type: boolean
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    Announcement:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        body:
          type: string
        startsAt:
          type: string
          format: date-time
          nullable: true
        endsAt:
          type: string
          format: date-time
          nullable: true
        isActive:
          type: boolean
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

# Note: future versions can link these statuses to real health checks or incident automation.
`;

export default function adminRoutes({ prisma }) {
  const router = Router();

  router.use(requireAdmin);

  router.get("/", (req, res) => {
    res.redirect("/admin/services");
  });

  router.get("/services", async (req, res, next) => {
    try {
      const services = await prisma.service.findMany({
        orderBy: [{ category: "asc" }, { name: "asc" }]
      });
      res.render("admin/services", {
        title: "Manage Services",
        services,
        activeTab: "services"
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/services", async (req, res, next) => {
    try {
      const parsed = serviceSchema.safeParse(req.body);
      if (!parsed.success) {
        req.flash("error", parsed.error.issues[0].message);
        return res.redirect("/admin/services");
      }
      const { name, description, category, status, isActive } = parsed.data;
      await prisma.service.create({
        data: {
          name,
          description: description || null,
          category: category || null,
          status,
          isActive: Boolean(isActive)
        }
      });
      req.flash("success", "Service created.");
      return res.redirect("/admin/services");
    } catch (error) {
      return next(error);
    }
  });

  router.post("/services/:id", async (req, res, next) => {
    try {
      const parsed = serviceSchema.safeParse(req.body);
      if (!parsed.success) {
        req.flash("error", parsed.error.issues[0].message);
        return res.redirect("/admin/services");
      }
      const { name, description, category, status, isActive } = parsed.data;
      await prisma.service.update({
        where: { id: req.params.id },
        data: {
          name,
          description: description || null,
          category: category || null,
          status,
          isActive: Boolean(isActive)
        }
      });
      req.flash("success", "Service updated.");
      return res.redirect("/admin/services");
    } catch (error) {
      return next(error);
    }
  });

  router.post("/services/:id/delete", async (req, res, next) => {
    try {
      await prisma.service.delete({ where: { id: req.params.id } });
      req.flash("success", "Service deleted.");
      return res.redirect("/admin/services");
    } catch (error) {
      return next(error);
    }
  });

  router.get("/announcements", async (req, res, next) => {
    try {
      const announcements = await prisma.announcement.findMany({
        orderBy: { createdAt: "desc" }
      });
      res.render("admin/announcements", {
        title: "Manage Announcements",
        announcements,
        activeTab: "announcements"
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/announcements", async (req, res, next) => {
    try {
      const parsed = announcementSchema.safeParse(req.body);
      if (!parsed.success) {
        req.flash("error", parsed.error.issues[0].message);
        return res.redirect("/admin/announcements");
      }
      const { title, body, startsAt, endsAt, isActive } = parsed.data;
      await prisma.announcement.create({
        data: {
          title,
          body,
          startsAt: parseDate(startsAt),
          endsAt: parseDate(endsAt),
          isActive: Boolean(isActive)
        }
      });
      req.flash("success", "Announcement created.");
      return res.redirect("/admin/announcements");
    } catch (error) {
      return next(error);
    }
  });

  router.post("/announcements/:id", async (req, res, next) => {
    try {
      const parsed = announcementSchema.safeParse(req.body);
      if (!parsed.success) {
        req.flash("error", parsed.error.issues[0].message);
        return res.redirect("/admin/announcements");
      }
      const { title, body, startsAt, endsAt, isActive } = parsed.data;
      await prisma.announcement.update({
        where: { id: req.params.id },
        data: {
          title,
          body,
          startsAt: parseDate(startsAt),
          endsAt: parseDate(endsAt),
          isActive: Boolean(isActive)
        }
      });
      req.flash("success", "Announcement updated.");
      return res.redirect("/admin/announcements");
    } catch (error) {
      return next(error);
    }
  });

  router.post("/announcements/:id/delete", async (req, res, next) => {
    try {
      await prisma.announcement.delete({ where: { id: req.params.id } });
      req.flash("success", "Announcement deleted.");
      return res.redirect("/admin/announcements");
    } catch (error) {
      return next(error);
    }
  });

  router.get("/openapi", (req, res) => {
    res.render("admin/openapi", {
      title: "OpenAPI Spec",
      activeTab: "openapi",
      spec: openApiSpec
    });
  });

  return router;
}
