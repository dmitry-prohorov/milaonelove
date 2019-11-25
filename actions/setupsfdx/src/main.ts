import * as core from "@actions/core";
import * as installer from "./installer";

async function run() {
  try {
    await installer.getSfdxCli();
  } catch (error) {
    console.log(error);
    core.setFailed(error.message);
  }
}

run();
