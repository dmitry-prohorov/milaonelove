import * as core from "@actions/core";
import * as os from "os";

async function run() {
  try {
    core.debug("Check os settings");
    core.debug(`platform: ${os.platform()}`);
    core.debug(`arch: ${os.arch()}`);
    core.debug(`type: ${os.type()}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
