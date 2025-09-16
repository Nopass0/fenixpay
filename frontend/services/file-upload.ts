import { traderApiInstance } from "./api";

export const fileUploadService = {
  async uploadFiles(files: File[]): Promise<string[]> {
    const formData = new FormData();
    
    // If multiple files, append each one
    if (files.length > 1) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    } else if (files.length === 1) {
      // For single file, still use "files" key to match backend
      formData.append("files", files[0]);
    }

    const response = await traderApiInstance.post("/trader/payouts/upload", formData);

    if (response.data.success) {
      return response.data.urls;
    } else {
      throw new Error(response.data.error || "Failed to upload files");
    }
  },
};