import express from "express";
import session from "express-session";
import flash from "connect-flash";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import adminRoutes from "./routes/admin.js";
import apiRoutes from "./routes/api.js";
import { STATUS_LABELS, STATUS_COLORS } from "./lib/status.js";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionSecret = process.env.SESSION_SECRET || "dev-secret-change-me";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = {
    success: req.flash("success"),
    error: req.flash("error")
  };
  res.locals.statusLabels = STATUS_LABELS;
  res.locals.statusColors = STATUS_COLORS;
  res.locals.version = "v1.0.0";
  next();
});

app.get("/", (req, res) => res.redirect("/dashboard"));

app.use(authRoutes({ prisma, bcrypt }));
app.use("/dashboard", dashboardRoutes({ prisma }));
app.use("/admin", adminRoutes({ prisma }));
app.use("/api", apiRoutes({ prisma }));

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).render("error", {
    title: "Something went wrong",
    message: "We hit an unexpected error. Please try again."
  });
});

const seedAdmin = async () => {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!existing) {
    const password = await bcrypt.hash("Brillar", 10);
    await prisma.user.create({
      data: {
        username: "admin",
        password,
        role: "admin"
      }
    });
    // eslint-disable-next-line no-console
    console.log("Seeded default admin user.");
  }
};

const start = async () => {
  await seedAdmin();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`OSS Support Portal running on port ${port}`);
  });
};

start();
