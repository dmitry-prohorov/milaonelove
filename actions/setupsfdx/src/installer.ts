import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { exec as childExec } from "child_process";
import { promisify } from "util";
let tempDirectory = process.env["RUNNER_TEMP"] || "";
let osPlat: string = os.platform();
// specify hardcoded latest version which will be update in future
const DEFAULT_LATEST_VERSION = "sfdx-cli-v6.56.0-e3fd846a1f";
const execa = promisify(childExec);
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
const sfdxCliConfig = path.join(tempDirectory, "sfdx-cli-config");
const sfdxCliVersionFile = path.resolve(sfdxCliConfig, "version.txt");

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
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
  await exec.exec("sfdx", ["update"]);

  const { stdout } = await execa("sfdx version");
  if (stdout) {
    const version = (stdout.split(" ").shift() || "").replace("/", "-v");
    await saveLatestVersion(version);
  }
}

async function acquireSfdxCli(): Promise<string> {
  const version = await getLatestVersion();
  console.log(version);
  const urlBase =
    "https://developer.salesforce.com/media/salesforce-cli/sfdx-cli/channels/stable/";
  // sfdx-cli-v7.33.2-045d48473e-darwin-x64.tar.xz
  const osArch: string = translateArchToDistUrl(os.arch());

  let fileName: string;
  if (osPlat === "win32") {
    fileName = `${version}-${osArch}.exe`;
  } else {
    fileName = `${version}-${osPlat}-${osArch}.tar.xz`;
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
    extPath = await tc.extractTar(downloadPath, undefined, "xJf");
  }

  //
  // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
  //
  let toolRoot = path.join(extPath, fileName);
  return await tc.cacheDir(toolRoot, "sfdx-cli", "latest");
}

async function getLatestVersion(): Promise<string> {
  const toolVersionPath = tc.find("sfdx-cli-version", "latest");
  if (!toolVersionPath) {
    await saveLatestVersion(DEFAULT_LATEST_VERSION);
    return DEFAULT_LATEST_VERSION;
  }

  return fs.promises.readFile(sfdxCliVersionFile, "utf8");
}

async function saveLatestVersion(version: string): Promise<void> {
  // Create folder to store sfdx-cli version
  await io.mkdirP(sfdxCliConfig);

  await fs.promises.writeFile(
    path.resolve(sfdxCliConfig, "version.txt"),
    version,
    { encoding: "utf8" }
  );

  await tc.cacheDir(sfdxCliConfig, "sfdx-cli-version", "latest");
}

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
