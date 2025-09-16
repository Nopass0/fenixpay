import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /* ───────────────── List all whitelisted IPs ───────────────── */
    .get(
      "/list",
      async () => {
        const ips = await db.adminIpWhitelist.findMany({
          orderBy: { createdAt: "desc" },
        });
        return ips;
      },
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              ip: t.String(),
              description: t.Optional(t.String()),
              createdAt: t.String(),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── Add IP to whitelist ───────────────── */
    .post(
      "/add",
      async ({ body, error }) => {
        try {
          const ip = await db.adminIpWhitelist.create({
            data: {
              ip: body.ip,
              description: body.description,
            },
          });
          return {
            ...ip,
            createdAt: ip.createdAt.toISOString(),
          };
        } catch (e: any) {
          if (e.code === "P2002") {
            return error(409, { error: "IP already whitelisted" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({
          ip: t.String(),
          description: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            ip: t.String(),
            description: t.Optional(t.String()),
            createdAt: t.String(),
          }),
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── Remove IP from whitelist ───────────────── */
    .delete(
      "/remove",
      async ({ body, error }) => {
        try {
          await db.adminIpWhitelist.delete({
            where: { ip: body.ip },
          });
          return { ok: true };
        } catch (e: any) {
          if (e.code === "P2025") {
            return error(404, { error: "IP not found" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({
          ip: t.String(),
        }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    );