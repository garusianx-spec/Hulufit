import { Router } from "express";
import { authenticate, requirePermission } from "../../auth/middleware.js";
import type { Config } from "../../config/index.js";
import type { PresenceTracker } from "../../realtime/presence.js";
import type { MemoryStaging } from "../staging.js";
import { analytics, contentItems, paymentLogs, specialistRecords, userRecords } from "../../db/adminFixtures.js";

/**
 * Operations console API.
 *
 * Every route is behind a distinct admin permission rather than a blanket
 * "is admin" check, so a future read-only operator role can be granted
 * analytics without ever seeing payment logs.
 */
export function adminRouter(deps: {
  config: Config;
  presence: PresenceTracker;
  staging: MemoryStaging;
}) {
  const router = Router();
  const guard = [authenticate(deps.config)] as const;

  router.get("/admin/overview", ...guard, requirePermission("admin:analytics"), (_req, res) => {
    res.json({
      ...analytics,
      live: {
        onlineUsers: deps.presence.onlineCount(),
        openSockets: deps.presence.socketCount(),
        stagedUploads: deps.staging.size,
      },
      generatedAt: new Date().toISOString(),
    });
  });

  router.get("/admin/users", ...guard, requirePermission("admin:users"), (req, res) => {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    const items = q
      ? userRecords.filter((u) => `${u.name} ${u.phone}`.toLowerCase().includes(q))
      : userRecords;
    res.json({ items, total: items.length });
  });

  router.get("/admin/users/:id", ...guard, requirePermission("admin:users"), (req, res) => {
    const user = userRecords.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: { code: "not_found", message: "کاربر یافت نشد." } });
    res.json({
      user,
      payments: paymentLogs.filter((p) => p.userId === user.id),
    });
  });

  router.get("/admin/specialists", ...guard, requirePermission("admin:specialists"), (_req, res) => {
    res.json({ items: specialistRecords, total: specialistRecords.length });
  });

  router.get("/admin/content", ...guard, requirePermission("admin:content"), (_req, res) => {
    res.json({ items: contentItems, total: contentItems.length });
  });

  router.post("/admin/broadcast", ...guard, requirePermission("admin:broadcast"), (req, res) => {
    const { title, body, audience } = req.body ?? {};
    if (!title || !body) {
      return res
        .status(400)
        .json({ error: { code: "bad_request", message: "عنوان و متن اعلان الزامی است." } });
    }
    // Production: enqueue to the push provider, fan out by audience segment.
    res.status(202).json({
      accepted: true,
      audience: audience ?? "all",
      estimatedRecipients: analytics.users.active,
    });
  });

  return router;
}
