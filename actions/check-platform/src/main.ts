import * as core from "@actions/core";
import * as os from "os";

async function run() {
  try {
    console.log("Check os settings");
    console.log(`platform: ${os.platform()}`);
    console.log(`arch: ${os.arch()}`);
    console.log(`type: ${os.type()}`);

    core.debug("Check os settings");
    core.debug(`platform: ${os.platform()}`);
    core.debug(`arch: ${os.arch()}`);
    core.debug(`type: ${os.type()}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
