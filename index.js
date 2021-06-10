const core = require("@actions/core")

// most @actions toolkit packages have async methods
async function run() {
  try {
    // const lpath = core.getInput("labels-path") || ""
    // const token = core.getInput("token") || ""
    // const rpath = core.getInput("repositories-json-path") || ""

    core.info("job ran")

    // core.debug(new Date().toTimeString()) // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    // await wait(parseInt(ms))
    // core.info(new Date().toTimeString())

    // core.setOutput("time", new Date().toTimeString())
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
