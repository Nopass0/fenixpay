import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export default new Elysia()
  .get("/download", async ({ set }) => {
    const apkPath = join(process.cwd(), "uploads", "apk", "chase-mobile.apk");
    
    if (!existsSync(apkPath)) {
      // Return placeholder HTML page if APK doesn't exist yet
      const placeholderPath = join(process.cwd(), "uploads", "apk", "placeholder.html");
      if (existsSync(placeholderPath)) {
        set.headers["content-type"] = "text/html; charset=utf-8";
        return Bun.file(placeholderPath);
      }
      
      set.status = 404;
      return { error: "APK file not found" };
    }
    
    const versionInfoPath = join(process.cwd(), "uploads", "apk", "version-info.json");
    let filename = "chase-mobile.apk";
    
    if (existsSync(versionInfoPath)) {
      try {
        const versionInfo = JSON.parse(readFileSync(versionInfoPath, "utf-8"));
        filename = `chase-mobile-${versionInfo.version}.apk`;
      } catch (e) {
        // Use default filename
      }
    }
    
    set.headers["content-type"] = "application/vnd.android.package-archive";
    set.headers["content-disposition"] = `attachment; filename="${filename}"`;
    
    return Bun.file(apkPath);
  })
  .get("/version-info", async ({ set }) => {
    const versionInfoPath = join(process.cwd(), "uploads", "apk", "version-info.json");
    
    if (!existsSync(versionInfoPath)) {
      set.status = 404;
      return { error: "Version info not found" };
    }
    
    try {
      const versionInfo = JSON.parse(readFileSync(versionInfoPath, "utf-8"));
      return versionInfo;
    } catch (e) {
      set.status = 500;
      return { error: "Failed to read version info" };
    }
  });