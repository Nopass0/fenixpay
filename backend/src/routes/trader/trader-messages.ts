import { Elysia, t } from "elysia";
import { db } from "@/db";
import { authPlugin } from "@/plugins/auth";
import { MessageType, MessagePriority } from "@prisma/client";

export const traderMessagesRoutes = new Elysia({ prefix: "/trader-messages" })
  .use(authPlugin({ variant: "trader" }))
  .get("/", async ({ trader, query }) => {
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "20");
    const filter = query.filter as "all" | "unread" | "starred" | undefined;
    const type = query.type as MessageType | undefined;
    const search = query.search;

    const where: any = { traderId: trader.id };
    
    if (filter === "unread") {
      where.isRead = false;
    } else if (filter === "starred") {
      where.isStarred = true;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } }
      ];
    }

    const [messages, total, unreadCount] = await Promise.all([
      db.message.findMany({
        where,
        include: {
          attachments: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.message.count({ where }),
      db.message.count({
        where: {
          traderId: trader.id,
          isRead: false
        }
      })
    ]);

    return {
      success: true,
      data: {
        messages,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  })
  .get("/:id", async ({ trader, params, set }) => {
    const message = await db.message.findUnique({
      where: { id: params.id },
      include: {
        attachments: true
      }
    });

    if (!message) {
      set.status = 404;
      return {
        success: false,
        error: "Message not found"
      };
    }

    if (message.traderId !== trader.id) {
      set.status = 403;
      return {
        success: false,
        error: "Access denied"
      };
    }

    // Mark as read if not already
    if (!message.isRead) {
      await db.message.update({
        where: { id: params.id },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    }

    return {
      success: true,
      data: message
    };
  })
  .post("/:id/read", async ({ trader, params, set }) => {
    const message = await db.message.findUnique({
      where: { id: params.id }
    });

    if (!message) {
      set.status = 404;
      return {
        success: false,
        error: "Message not found"
      };
    }

    if (message.traderId !== trader.id) {
      set.status = 403;
      return {
        success: false,
        error: "Access denied"
      };
    }

    await db.message.update({
      where: { id: params.id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return {
      success: true,
      message: "Message marked as read"
    };
  })
  .post("/:id/unread", async ({ trader, params, set }) => {
    const message = await db.message.findUnique({
      where: { id: params.id }
    });

    if (!message) {
      set.status = 404;
      return {
        success: false,
        error: "Message not found"
      };
    }

    if (message.traderId !== trader.id) {
      set.status = 403;
      return {
        success: false,
        error: "Access denied"
      };
    }

    await db.message.update({
      where: { id: params.id },
      data: {
        isRead: false,
        readAt: null
      }
    });

    return {
      success: true,
      message: "Message marked as unread"
    };
  })
  .post("/:id/star", async ({ trader, params, set }) => {
    const message = await db.message.findUnique({
      where: { id: params.id }
    });

    if (!message) {
      set.status = 404;
      return {
        success: false,
        error: "Message not found"
      };
    }

    if (message.traderId !== trader.id) {
      set.status = 403;
      return {
        success: false,
        error: "Access denied"
      };
    }

    await db.message.update({
      where: { id: params.id },
      data: {
        isStarred: true
      }
    });

    return {
      success: true,
      message: "Message starred"
    };
  })
  .post("/:id/unstar", async ({ trader, params, set }) => {
    const message = await db.message.findUnique({
      where: { id: params.id }
    });

    if (!message) {
      set.status = 404;
      return {
        success: false,
        error: "Message not found"
      };
    }

    if (message.traderId !== trader.id) {
      set.status = 403;
      return {
        success: false,
        error: "Access denied"
      };
    }

    await db.message.update({
      where: { id: params.id },
      data: {
        isStarred: false
      }
    });

    return {
      success: true,
      message: "Message unstarred"
    };
  })
  .post("/mark-all-read", async ({ trader }) => {
    await db.message.updateMany({
      where: {
        traderId: trader.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return {
      success: true,
      message: "All messages marked as read"
    };
  })
  .delete("/:id", async ({ trader, params, set }) => {
    const message = await db.message.findUnique({
      where: { id: params.id }
    });

    if (!message) {
      set.status = 404;
      return {
        success: false,
        error: "Message not found"
      };
    }

    if (message.traderId !== trader.id) {
      set.status = 403;
      return {
        success: false,
        error: "Access denied"
      };
    }

    await db.message.delete({
      where: { id: params.id }
    });

    return {
      success: true,
      message: "Message deleted"
    };
  });