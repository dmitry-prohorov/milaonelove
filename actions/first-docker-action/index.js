const core = require("@actions/core");
const github = require("@actions/github");
const path = require("path");
const fs = require("fs");

async function run() {
  try {
    // const firstarg = core.getInput("first-arg");
    // console.log(`Hello ${firstarg}!`);
    // const secondarg = core.getInput("second-arg");
    // console.log(`Hello ${secondarg}!`);
    // // Get the JSON webhook payload for the event that triggered the workflow
    // const payload = JSON.stringify(github.context.payload, undefined, 2);
    // console.log(`The event payload: ${payload}`);
    console.log(process.cwd());
    let files = await fs.promises.readdir(process.cwd());
    console.log("current dir", files);
    console.log(path.resolve(process.cwd(), ".."));
    files = await fs.promises.readdir(path.resolve(process.cwd(), ".."));
    console.log("parent dir", files);
    console.log(path.resolve(process.cwd(), "..", ".."));
    files = await fs.promises.readdir(path.resolve(process.cwd(), "..", ".."));
    console.log("grand parent dir", files);
    core.setOutput("project-structure", files);
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();
