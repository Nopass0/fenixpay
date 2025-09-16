import Elysia from "elysia";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { fileUploadService } from "../services/file-upload.service";

export const uploadsApi = new Elysia({ prefix: "/uploads" })
  // Serve uploaded files
  .get("/payouts/:filename", async ({ params, set }) => {
    try {
      const filePath = fileUploadService.getFilePath(params.filename);
      
      if (!existsSync(filePath)) {
        set.status = 404;
        return { error: "File not found" };
      }
      
      // Determine content type based on file extension
      const ext = params.filename.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'doc':
          contentType = 'application/msword';
          break;
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
      }
      
      set.headers['Content-Type'] = contentType;
      set.headers['Content-Disposition'] = `attachment; filename="${params.filename}"`;
      
      return new Response(Bun.file(filePath));
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  });