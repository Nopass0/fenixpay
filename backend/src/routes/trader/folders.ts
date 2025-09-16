import { Elysia, t } from "elysia";
import { db } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";

export default new Elysia({ prefix: "/folders" })
  .use(traderGuard())
  
  // Get all folders with pagination and search
  .get("/", async ({ trader, query }) => {
    try {
      const { page = 1, limit = 20, search = "" } = query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where = {
        traderId: trader.id,
        ...(search && {
          title: {
            contains: search as string,
            mode: 'insensitive' as const
          }
        })
      };

      // Get total count
      const total = await db.folder.count({ where });

      // Get folders with requisites
      const folders = await db.folder.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          requisites: {
            include: {
              requisite: {
                include: {
                  device: true
                }
              }
            }
          }
        }
      });

      return {
        success: true,
        data: folders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      console.error("Failed to get folders:", error);
      throw new Error("Failed to get folders");
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String())
    })
  })
  
  // Get single folder
  .get("/:id", async ({ trader, params }) => {
    try {
      const folder = await db.folder.findFirst({
        where: {
          id: params.id,
          traderId: trader.id
        },
        include: {
          requisites: {
            include: {
              requisite: {
                include: {
                  device: true
                }
              }
            }
          }
        }
      });

      if (!folder) {
        throw new Error("Folder not found");
      }

      return {
        success: true,
        data: folder
      };
    } catch (error) {
      console.error("Failed to get folder:", error);
      throw new Error("Failed to get folder");
    }
  })
  
  // Create new folder
  .post("/", async ({ trader, body }) => {
    try {
      const { title, requisiteIds } = body;

      // Filter out null values from requisiteIds
      const validRequisiteIds = requisiteIds.filter(id => id !== null && id !== undefined);

      // Verify that all requisites belong to the trader
      const requisites = await db.bankDetail.findMany({
        where: {
          id: { in: validRequisiteIds },
          userId: trader.id
        }
      });

      if (requisites.length !== validRequisiteIds.length) {
        throw new Error("Some requisites not found or don't belong to you");
      }

      // Create folder with requisites
      const folder = await db.folder.create({
        data: {
          title,
          traderId: trader.id,
          requisites: {
            create: validRequisiteIds.map(requisiteId => ({
              requisiteId
            }))
          }
        },
        include: {
          requisites: {
            include: {
              requisite: {
                include: {
                  device: true
                }
              }
            }
          }
        }
      });

      return {
        success: true,
        data: folder
      };
    } catch (error) {
      console.error("Failed to create folder:", error);
      throw new Error("Failed to create folder");
    }
  }, {
    body: t.Object({
      title: t.String(),
      requisiteIds: t.Array(t.Union([t.String(), t.Null()]))
    })
  })
  
  // Update folder
  .put("/:id", async ({ trader, params, body }) => {
    try {
      const { title, requisiteIds, isActive } = body;

      // Check if folder exists and belongs to trader
      const existingFolder = await db.folder.findFirst({
        where: {
          id: params.id,
          traderId: trader.id
        }
      });

      if (!existingFolder) {
        throw new Error("Folder not found");
      }

      // If requisiteIds provided, verify they belong to trader
      if (requisiteIds) {
        // Filter out null values from requisiteIds
        const validRequisiteIds = requisiteIds.filter(id => id !== null && id !== undefined);
        
        const requisites = await db.bankDetail.findMany({
          where: {
            id: { in: validRequisiteIds },
            userId: trader.id
          }
        });

        if (requisites.length !== validRequisiteIds.length) {
          throw new Error("Some requisites not found or don't belong to you");
        }
      }

      // Update folder
      const folder = await db.folder.update({
        where: { id: params.id },
        data: {
          ...(title !== undefined && { title }),
          ...(isActive !== undefined && { isActive }),
          ...(requisiteIds !== undefined && {
            requisites: {
              deleteMany: {},
              create: requisiteIds
                .filter(id => id !== null && id !== undefined)
                .map(requisiteId => ({
                  requisiteId
                }))
            }
          })
        },
        include: {
          requisites: {
            include: {
              requisite: {
                include: {
                  device: true
                }
              }
            }
          }
        }
      });

      return {
        success: true,
        data: folder
      };
    } catch (error) {
      console.error("Failed to update folder:", error);
      throw new Error("Failed to update folder");
    }
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      requisiteIds: t.Optional(t.Array(t.Union([t.String(), t.Null()]))),
      isActive: t.Optional(t.Boolean())
    })
  })
  
  // Delete folder
  .delete("/:id", async ({ trader, params }) => {
    try {
      // Check if folder exists and belongs to trader
      const folder = await db.folder.findFirst({
        where: {
          id: params.id,
          traderId: trader.id
        }
      });

      if (!folder) {
        throw new Error("Folder not found");
      }

      // Delete folder (cascades to RequisiteOnFolder)
      await db.folder.delete({
        where: { id: params.id }
      });

      return {
        success: true,
        message: "Folder deleted successfully"
      };
    } catch (error) {
      console.error("Failed to delete folder:", error);
      throw new Error("Failed to delete folder");
    }
  })
  
  // Start all requisites in folder
  .post("/:id/start-all", async ({ trader, params }) => {
    try {
      // Get folder with requisites
      const folder = await db.folder.findFirst({
        where: {
          id: params.id,
          traderId: trader.id
        },
        include: {
          requisites: {
            include: {
              requisite: true
            }
          }
        }
      });

      if (!folder) {
        throw new Error("Folder not found");
      }

      // Update all requisites to not archived
      const requisiteIds = folder.requisites.map(r => r.requisiteId);
      await db.bankDetail.updateMany({
        where: {
          id: { in: requisiteIds },
          userId: trader.id
        },
        data: {
          isArchived: false
        }
      });

      // Update folder to active
      await db.folder.update({
        where: { id: params.id },
        data: { isActive: true }
      });

      return {
        success: true,
        message: "All requisites in folder started"
      };
    } catch (error) {
      console.error("Failed to start all requisites:", error);
      throw new Error("Failed to start all requisites");
    }
  })
  
  // Stop all requisites in folder
  .post("/:id/stop-all", async ({ trader, params }) => {
    try {
      // Get folder with requisites
      const folder = await db.folder.findFirst({
        where: {
          id: params.id,
          traderId: trader.id
        },
        include: {
          requisites: {
            include: {
              requisite: true
            }
          }
        }
      });

      if (!folder) {
        throw new Error("Folder not found");
      }

      // Update all requisites to archived
      const requisiteIds = folder.requisites.map(r => r.requisiteId);
      await db.bankDetail.updateMany({
        where: {
          id: { in: requisiteIds },
          userId: trader.id
        },
        data: {
          isArchived: true
        }
      });

      // Update folder to inactive
      await db.folder.update({
        where: { id: params.id },
        data: { isActive: false }
      });

      return {
        success: true,
        message: "All requisites in folder stopped"
      };
    } catch (error) {
      console.error("Failed to stop all requisites:", error);
      throw new Error("Failed to stop all requisites");
    }
  });