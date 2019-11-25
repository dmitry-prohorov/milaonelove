#!/usr/bin/env node

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
    console.log(process.argv);
    console.log(process.env["INPUT_FIRST-ARG"]);
    console.log(process.env["INPUT_SECOND-ARG"]);
    console.log(process.env["HOME"]);
    console.log(process.env["GITHUB_REF"]);
    console.log(process.env["GITHUB_SHA"]);
    console.log(process.env["GITHUB_REPOSITORY"]);
    console.log(process.env["GITHUB_ACTOR"]);
    console.log(process.env["GITHUB_WORKFLOW"]);
    console.log(process.env["GITHUB_HEAD_REF"]);
    console.log(process.env["GITHUB_REF"]);
    console.log(process.env["GITHUB_BASE_REF"]);
    console.log(process.env["GITHUB_EVENT_NAME"]);
    console.log(process.env["GITHUB_WORKSPACE"]);
    console.log(process.env["GITHUB_ACTION"]);
    console.log(process.env["GITHUB_EVENT_PATH"]);
    console.log(process.env["RUNNER_OS"]);
    console.log(process.env["RUNNER_TOOL_CACHE"]);
    console.log(process.env["RUNNER_TEMP"]);
    console.log(process.env["RUNNER_WORKSPACE"]);
    console.log(process.env["ACTIONS_RUNTIME_URL"]);
    console.log(process.env["ACTIONS_RUNTIME_TOKEN"]);
    console.log(process.env["GITHUB_ACTIONS"]);
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
