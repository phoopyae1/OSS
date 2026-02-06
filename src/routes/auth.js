import { Router } from "express";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export default function authRoutes({ prisma, bcrypt }) {
  const router = Router();

  router.get("/login", (req, res) => {
    res.render("auth/login", { title: "Login" });
  });

  router.post("/login", async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        req.flash("error", parsed.error.issues[0].message);
        return res.redirect("/login");
      }
      const { username, password } = parsed.data;
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        req.flash("error", "Invalid credentials.");
        return res.redirect("/login");
      }
      const matches = await bcrypt.compare(password, user.password);
      if (!matches) {
        req.flash("error", "Invalid credentials.");
        return res.redirect("/login");
      }
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };
      req.flash("success", `Welcome back, ${user.username}!`);
      return res.redirect("/dashboard");
    } catch (error) {
      return next(error);
    }
  });

  router.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });

  return router;
}
