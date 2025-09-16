#!/usr/bin/env bun

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const GITHUB_REPO = "Nopass0/chase";
const UPLOAD_DIR = join(process.cwd(), "uploads", "apk");

async function downloadLatestAPK() {
  console.log("🔍 Fetching latest release from GitHub...");
  
  try {
    // Create directory if it doesn't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    
    // Fetch latest release
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    
    if (!response.ok) {
      console.error("❌ Failed to fetch latest release:", response.statusText);
      return;
    }
    
    const release = await response.json();
    console.log(`📦 Found release: ${release.name} (${release.tag_name})`);
    
    // Find APK asset
    const apkAsset = release.assets?.find((asset: any) => asset.name.endsWith('.apk'));
    
    if (!apkAsset) {
      console.error("❌ No APK found in latest release");
      return;
    }
    
    console.log(`📱 Found APK: ${apkAsset.name} (${(apkAsset.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`⬇️  Downloading from: ${apkAsset.browser_download_url}`);
    
    // Download APK
    const apkResponse = await fetch(apkAsset.browser_download_url);
    
    if (!apkResponse.ok) {
      console.error("❌ Failed to download APK:", apkResponse.statusText);
      return;
    }
    
    const apkBuffer = await apkResponse.arrayBuffer();
    
    // Save as chase-mobile.apk
    const apkPath = join(UPLOAD_DIR, "chase-mobile.apk");
    await writeFile(apkPath, Buffer.from(apkBuffer));
    
    console.log(`✅ APK saved to: ${apkPath}`);
    
    // Save version info
    const versionInfo = {
      version: release.tag_name.replace('v', ''),
      fileSize: apkAsset.size,
      downloadUrl: "/api/app/download",
      githubUrl: apkAsset.browser_download_url,
      buildDate: apkAsset.created_at,
      releaseName: release.name,
      releaseNotes: release.body
    };
    
    const versionPath = join(UPLOAD_DIR, "version-info.json");
    await writeFile(versionPath, JSON.stringify(versionInfo, null, 2));
    
    console.log(`📝 Version info saved to: ${versionPath}`);
    console.log("\n✨ Successfully downloaded latest APK!");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the script
downloadLatestAPK();