import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as semver from "semver";
let tempDirectory = process.env["RUNNER_TEMP"] || "";
let osPlat: string = os.platform();
// specify hardcoded latest version which will be update in future
const DEFAULT_LATEST_VERSION = "7.33.2-045d48473e";
// https://developer.salesforce.com/media/salesforce-cli/sfdx-cli/channels/stable/sfdx-cli-v6.56.0-e3fd846a1f-x86.exe

if (!tempDirectory) {
  let baseLocation;
  switch (osPlat) {
    case "win32":
      // On windows use the USERPROFILE env variable
      baseLocation = process.env["USERPROFILE"] || "C:\\";
      break;
    case "darwin":
      baseLocation = "/Users";
      break;
    case "linux":
      baseLocation = "/home";
      break;
    default:
      throw new Error(`Unexpected OS '${osPlat}'`);
  }
  tempDirectory = path.join(baseLocation, "actions", "temp");
}
// const tempSfdxCliVersionFile = path.resolve(tempDirectory, "version.txt");

import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";

export async function getSfdxCli() {
  console.log(tc.findAllVersions("node"));
  console.log(tc.findAllVersions("sfdx"));
  console.log(
    await fs.promises.readdir(
      path.resolve(<string>process.env["RUNNER_TOOL_CACHE"])
    )
  );
  const versionSpec = semver.clean(DEFAULT_LATEST_VERSION);
  console.log("versionSpec: ", versionSpec);
  // always check latest version
  let toolPath = tc.find("sfdx", versionSpec);
  console.log("toolPath: ", toolPath);

  // If not found in cache => download, extract, cache
  if (!toolPath) {
    toolPath = await acquireSfdxCli(versionSpec);
  }

  console.log("toolPath: ", toolPath);
  console.log(await fs.promises.readdir(toolPath));

  //
  // a tool installer initimately knows details about the layout of that tool
  // for example, node binary is in the bin folder after the extract on Mac/Linux.
  // layouts could change by version, by platform etc... but that's the tool installers job
  //
  if (osPlat != "win32") {
    toolPath = path.join(toolPath, "bin");
  }

  console.log(await fs.promises.readdir(toolPath));
  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(toolPath);
  console.log(process.env["PATH"]);
}

async function acquireSfdxCli(versionSpec: string): Promise<string> {
  const urlBase =
    "https://developer.salesforce.com/media/salesforce-cli/sfdx-cli/channels/stable";
  const osArch: string = translateArchToDistUrl(os.arch());

  let fileName: string;
  let urlFileName: string;
  if (osPlat === "win32") {
    fileName = `sfdx-cli-v${versionSpec}-${osArch}`;
    urlFileName = `${fileName}.exe`;
  } else {
    fileName = `sfdx-cli-v${versionSpec}-${osPlat}-${osArch}`;
    urlFileName = `${fileName}.tar.xz`;
  }
  const downloadPath: string = await tc.downloadTool(
    `${urlBase}/${urlFileName}`
  );

  //
  // Extract
  //
  let extPath: string;
  if (osPlat === "win32") {
    let _7zPath = path.join(__dirname, "..", "externals", "7zr.exe");
    extPath = await tc.extract7z(downloadPath, undefined, _7zPath);
  } else {
    extPath = await tc.extractTar(downloadPath, undefined, "xJ");
  }

  //
  // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
  //
  let toolRoot = path.join(extPath, fileName);
  return await tc.cacheDir(toolRoot, "sfdx", versionSpec);
}

// async function getLatestVersion(): Promise<string> {
//   const toolVersionPath = tc.find("sfdx-cli", "latest");
//   console.log("request sfdx-cli-version: ", toolVersionPath);
//   if (!toolVersionPath) {
//     await saveLatestVersion(DEFAULT_LATEST_VERSION);
//     console.log(
//       "request sfdx-cli-version: ",
//       tc.find("sfdx-cli-version", "latest")
//     );
//     return DEFAULT_LATEST_VERSION;
//   }

//   return toolVersionPath;
// }

// async function saveLatestVersion(version: string): Promise<string> {
//   // Create folder to store sfdx-cli version
//   await fs.promises.writeFile(tempSfdxCliVersionFile, version, {
//     encoding: "utf8"
//   });

//   return tc.cacheFile(tempSfdxCliVersionFile, "version.txt", "sfdx", "latest");
// }

// map arch to download dist url format https://developer.salesforce.com/media/salesforce-cli
function translateArchToDistUrl(arch: string): string {
  switch (arch) {
    case "arm64":
    case "x64":
    case "ppc64":
      return "x64";
    case "arm":
      return "arm";
    case "x32":
      return "x86";
    default:
      return "x32";
  }
}
