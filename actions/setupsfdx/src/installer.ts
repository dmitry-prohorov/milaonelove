import * as os from "os";
import * as path from "path";
let tempDirectory = process.env["RUNNER_TEMP"] || "";
let osPlat: string = os.platform();

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

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";

export async function getSfdxCli() {
  // always check latest version
  let toolPath = tc.find("sfdx-cli", "latest");

  // If not found in cache => download, extract, cache
  if (!toolPath) {
    toolPath = await acquireSfdxCli();
  }

  //
  // a tool installer initimately knows details about the layout of that tool
  // for example, node binary is in the bin folder after the extract on Mac/Linux.
  // layouts could change by version, by platform etc... but that's the tool installers job
  //
  if (osPlat != "win32") {
    toolPath = path.join(toolPath, "bin");
  }

  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(toolPath);

  // update sfdx cli to latest version
  exec.exec("sfdx", ["update"]);
}

async function acquireSfdxCli(): Promise<string> {
  const urlBase = "https://developer.salesforce.com/media/salesforce-cli";
  const osArch: string = translateArchToDistUrl(os.arch());
  let fileName: string;
  switch (osPlat) {
    case "win32":
      // On windows use the USERPROFILE env variable
      fileName = `sfdx-windows-${osArch}.exe`;
      break;
    case "darwin":
      fileName = `sfdx-osx.pkg`;
      break;
    case "linux":
      fileName = `sfdx-linux-${osArch}.tar.xz`;
      break;
    default:
      throw new Error(`Unexpected OS '${osPlat}'`);
  }

  console.log(`download url: ${urlBase}/${fileName}`);
  const downloadPath: string = await tc.downloadTool(`${urlBase}/${fileName}`);

  //
  // Extract
  //
  let extPath: string;
  if (osPlat === "win32") {
    let _7zPath = path.join(__dirname, "..", "externals", "7zr.exe");
    extPath = await tc.extract7z(downloadPath, undefined, _7zPath);
  } else {
    extPath = await tc.extractTar(downloadPath);
  }

  //
  // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
  //
  let toolRoot = path.join(extPath, fileName);
  return await tc.cacheDir(toolRoot, "sfdx-cli", "latest");
}

// map arch to download dist url format https://developer.salesforce.com/media/salesforce-cli
function translateArchToDistUrl(arch: string): string {
  switch (arch) {
    case "arm64":
    case "x64":
    case "ppc64":
      return "amd64";
    default:
      return "386";
  }
}
