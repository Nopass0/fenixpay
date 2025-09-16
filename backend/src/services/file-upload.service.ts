import { mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

class FileUploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = join(process.cwd(), "uploads", "payouts");
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFiles(files: File[]): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileName = `${uuidv4()}-${file.name}`;
      const filePath = join(this.uploadDir, fileName);
      
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Save file
      await writeFile(filePath, buffer);
      
      // Generate URL - just store the filename, not the full path
      const fileUrl = fileName;
      uploadedUrls.push(fileUrl);
    }

    return uploadedUrls;
  }

  getFilePath(fileUrl: string): string {
    const fileName = fileUrl.split("/").pop();
    return join(this.uploadDir, fileName || "");
  }
}

export const fileUploadService = new FileUploadService();