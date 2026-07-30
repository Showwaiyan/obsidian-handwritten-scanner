import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// Validate version format (semver-ish)
if (!targetVersion || !/^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/.test(targetVersion)) {
    throw new Error("Invalid or missing npm_package_version: " + String(targetVersion));
}

// Read manifest and update version
const manifestPath = "manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t"), { encoding: "utf8" });

// Update versions.json in repo root only
const versionsPath = "versions.json";
const versions = JSON.parse(readFileSync(versionsPath, "utf8"));

// Only add the new version if not already present
if (!Object.prototype.hasOwnProperty.call(versions, targetVersion)) {
    versions[targetVersion] = minAppVersion;
    writeFileSync(versionsPath, JSON.stringify(versions, null, "\t"), { encoding: "utf8" });
}
