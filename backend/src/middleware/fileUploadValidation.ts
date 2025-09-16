/**
 * File upload validation middleware
 * Enforces size limits: 15MB per file, 60MB total
 */

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes
const MAX_TOTAL_SIZE = 60 * 1024 * 1024; // 60MB in bytes

/**
 * Calculate size of base64 string in bytes
 */
function getBase64Size(base64String: string): number {
  // Remove data URI prefix if present
  const base64 = base64String.replace(/^data:.*?;base64,/, '');
  
  // Calculate the size
  const padding = (base64.match(/=/g) || []).length;
  return base64.length * 0.75 - padding;
}

/**
 * Validate single file upload
 */
export function validateFileUpload(fileData: string, fileName?: string): { valid: boolean; error?: string } {
  if (!fileData) {
    return { valid: false, error: "File data is required" };
  }

  const fileSize = getBase64Size(fileData);
  
  if (fileSize > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File ${fileName ? `"${fileName}"` : ''} exceeds maximum size of 15MB` 
    };
  }

  // Validate file format if it has data URI
  if (fileData.startsWith('data:')) {
    const matches = fileData.match(/^data:(.+?);base64,/);
    if (!matches) {
      return { valid: false, error: "Invalid file format" };
    }
    
    const mimeType = matches[1];
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(mimeType)) {
      return { 
        valid: false, 
        error: `File type "${mimeType}" is not allowed. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX` 
      };
    }
  }

  return { valid: true };
}

/**
 * Validate multiple file uploads
 */
export function validateMultipleFileUploads(files: string[]): { valid: boolean; error?: string } {
  if (!Array.isArray(files)) {
    return { valid: false, error: "Files must be an array" };
  }

  if (files.length === 0) {
    return { valid: false, error: "At least one file is required" };
  }

  if (files.length > 10) {
    return { valid: false, error: "Maximum 10 files allowed" };
  }

  let totalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileSize = getBase64Size(file);
    
    // Check individual file size
    if (fileSize > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File ${i + 1} exceeds maximum size of 15MB` 
      };
    }

    totalSize += fileSize;
    
    // Check total size
    if (totalSize > MAX_TOTAL_SIZE) {
      return { 
        valid: false, 
        error: `Total file size exceeds maximum of 60MB` 
      };
    }
  }

  return { valid: true };
}

/**
 * Validate file URLs (for when files are uploaded separately and URLs are provided)
 */
export function validateFileUrls(urls: string[]): { valid: boolean; error?: string } {
  if (!Array.isArray(urls)) {
    return { valid: false, error: "URLs must be an array" };
  }

  if (urls.length === 0) {
    return { valid: false, error: "At least one URL is required" };
  }

  if (urls.length > 10) {
    return { valid: false, error: "Maximum 10 files allowed" };
  }

  // Validate each filename/URL
  for (const url of urls) {
    // Check if it's a filename (UUID-filename pattern) or a full URL
    const isFilename = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-.+$/i.test(url);
    
    if (!isFilename) {
      // If not a filename, try to validate as URL
      try {
        new URL(url);
      } catch {
        return { valid: false, error: `Invalid file reference: ${url}` };
      }
    }
  }

  return { valid: true };
}