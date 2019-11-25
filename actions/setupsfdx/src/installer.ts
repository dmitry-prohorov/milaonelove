import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as semver from "semver";
import { exec as childExec } from "child_process";
import { promisify } from "util";

let tempDirectory = process.env["RUNNER_TEMP"] || "";
let osPlat: string = os.platform();
// current latest sfdx cli version
// TODO: find a way to get these version via http
const DEFAULT_LATEST_VERSION = "7.33.2-045d48473e";
const execa = promisify(childExec);

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
import * as tc from "@actions/tool-cache";
import * as io from "@actions/io";

export async function getSfdxCli() {
  // find latest stored version
  let latestVersion = tc.findAllVersions("sfdx").reduce((result, version) => {
    if (semver.lt(result, version)) {
      result = version;
    }
    return result;
  }, DEFAULT_LATEST_VERSION);
  core.debug(`Latest stored version is: ${latestVersion}`);

  // always check latest version
  let toolPath = tc.find("sfdx", latestVersion);
  let tryToUpdate = true;

  // If not found in cache => download, extract, cache
  if (!toolPath) {
    toolPath = await acquireSfdxCli(latestVersion);
    tryToUpdate = false;
  } else {
    core.debug(`Tool found in cache ${toolPath}`);
  }

  //
  // a tool installer initimately knows details about the layout of that tool
  // for example, sfdx binary is in the bin folder after the extract on Mac/Linux.
  // layouts could change by version, by platform etc... but that's the tool installers job
  //
  if (osPlat != "win32") {
    toolPath = path.join(toolPath, "bin");
  }

  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(toolPath);

  // try to update cli
  if (tryToUpdate) {
    await updateCli();
  }
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
  let toolRoot: string;
  if (osPlat === "win32") {
    // let _7zPath = path.join(__dirname, "..", "externals", "7zr.exe");
    // extPath = await tc.extract7z(downloadPath);
    toolRoot = await extractWin(downloadPath);
  } else {
    extPath = await tc.extractTar(downloadPath, undefined, "xJ");
    toolRoot = path.join(extPath, fileName);
  }

  //
  // Install into the local tool cache - sfdx extracts with a root folder that matches the fileName downloaded
  //
  // let toolRoot = path.join(extPath, fileName);
  console.log(`toolRoot : ${toolRoot}`);
  return await tc.cacheDir(toolRoot, "sfdx", versionSpec);
}

async function updateCli(): Promise<void> {
  core.debug("Update CLI version");
  console.log("Update cli");
  const { stdout } = await execa("sfdx update");
  const latestVersion =
    ((stdout || "").split(" ").shift() || "").split("/").pop() || "";

  await cleanVersions(latestVersion);
}

// we keep only latest version and DEFAULT_LATEST_VERSION
// so all other version should be removed
async function cleanVersions(latestVersion: string): Promise<void> {
  if (!latestVersion) return;

  core.debug("Find old versions");
  const versionsToDelete = tc
    .findAllVersions("sfdx")
    .filter(
      version => version !== latestVersion && version !== DEFAULT_LATEST_VERSION
    );

  core.debug(`Clear old versions: ${versionsToDelete}`);
  for (let i = 0; i <= versionsToDelete.length; i++) {
    const versionPath = tc.find("sfdx", versionsToDelete[i]);
    if (versionPath) {
      await io.rmRF(versionPath);
    }
  }
}

async function extractWin(downloadPath: string): Promise<string> {
  // Create temporary folder to download in to
  let tempDownloadFolder: string =
    "temp_" + Math.floor(Math.random() * 2000000000);
  let tempDir: string = path.join(tempDirectory, tempDownloadFolder);
  await io.mkdirP(tempDir);

  await io.cp(downloadPath, path.join(tempDir, "sfdx.zip"));
  console.log(await fs.promises.readdir(tempDir));
  let _7zPath = path.join(__dirname, "..", "externals", "7zr.exe");

  return await tc.extract7z(path.join(tempDir, "sfdx.zip"), undefined, _7zPath);
}

// map arch to download dist url format
// @see https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm
function translateArchToDistUrl(arch: string): string {
  switch (arch) {
    case "arm64":
    case "x64":
      return "x64";
    case "arm":
      return "arm";
    case "x32":
      return "x86";
    default:
      return "x32";
  }
}
