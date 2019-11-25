import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import uuidV4 from "uuid/v4";
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
const tempSfdxCliVersionFile = path.resolve(tempDirectory, "version.txt");

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";

export async function getSfdxCli() {
  // always check latest version
  let toolPath = tc.find("sfdx", "latest");
  console.log("toolPath: ", toolPath);

  // If not found in cache => download, extract, cache
  if (!toolPath) {
    toolPath = await acquireSfdxCli();
  }

  console.log("toolPath: ", toolPath);
  console.log(
    await fs.promises.readdir(
      path.resolve(<string>process.env["RUNNER_TOOL_CACHE"])
    )
  );
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
  console.log(io.which("sfdx"));

  // update sfdx cli to latest version
  await exec.exec("sfdx", ["update"]);

  const { stdout } = await execa("sfdx version");
  if (stdout) {
    const version = (stdout.split(" ").shift() || "").replace("/", "-v");
    console.log("version: ", version);
    await saveLatestVersion(version);
  }
}

async function acquireSfdxCli(): Promise<string> {
  const urlBase =
    "https://developer.salesforce.com/media/salesforce-cli/sfdx-cli/channels/stable";
  // sfdx-cli-v7.33.2-045d48473e-darwin-x64.tar.xz
  const osArch: string = translateArchToDistUrl(os.arch());

  let fileName: string;
  let urlFileName: string;
  if (osPlat === "win32") {
    fileName = `${DEFAULT_LATEST_VERSION}-${osArch}`;
    urlFileName = `${fileName}.exe`;
  } else {
    fileName = `${DEFAULT_LATEST_VERSION}-${osPlat}-${osArch}`;
    urlFileName = `${fileName}.tar.xz`;
  }
  console.log(`download url: ${urlBase}/${fileName}`);
  const downloadPath: string = await tc.downloadTool(
    `${urlBase}/${urlFileName}`
  );

  //
  // Extract
  //
  console.log(fileName);
  console.log(downloadPath);
  console.log(await fs.promises.readdir(<string>process.env["RUNNER_TEMP"]));
  console.log(
    await fs.promises.readdir(<string>process.env["RUNNER_TOOL_CACHE"])
  );
  console.log(
    await fs.promises.readdir(
      path.resolve(<string>process.env["RUNNER_TOOL_CACHE"], "node")
    )
  );
  console.log(
    await fs.promises.readdir(
      path.resolve(<string>process.env["RUNNER_TOOL_CACHE"], "node", "10.17.0")
    )
  );
  console.log(
    await fs.promises.readdir(
      path.resolve(
        <string>process.env["RUNNER_TOOL_CACHE"],
        "node",
        "10.17.0",
        "x64"
      )
    )
  );
  console.log(
    await fs.promises.readFile(
      path.resolve(
        <string>process.env["RUNNER_TOOL_CACHE"],
        "node",
        "10.17.0",
        "x64.complete"
      ),
      "utf8"
    )
  );

  console.log((await fs.promises.stat(downloadPath)).isFile());
  let extPath: string;
  if (osPlat === "win32") {
    let _7zPath = path.join(__dirname, "..", "externals", "7zr.exe");
    extPath = await tc.extract7z(downloadPath, undefined, _7zPath);
  } else {
    extPath = await tc.extractTar(downloadPath, undefined, "xJ");
  }

  console.log(extPath);
  console.log(await fs.promises.readdir(extPath));
  console.log(await fs.promises.readdir(path.join(extPath, fileName)));
  //
  // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
  //
  let toolRoot = path.join(extPath, fileName);
  console.log("toolRoot: ", toolRoot);
  return await tc.cacheDir(toolRoot, "sfdx", "latest");
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

async function saveLatestVersion(version: string): Promise<string> {
  // Create folder to store sfdx-cli version
  await fs.promises.writeFile(tempSfdxCliVersionFile, version, {
    encoding: "utf8"
  });

  return tc.cacheFile(tempSfdxCliVersionFile, "version.txt", "sfdx", "latest");
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
