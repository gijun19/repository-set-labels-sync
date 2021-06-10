const core = require("@actions/core")
const path = require("path")
const { createRepoLabel } = require("./lib/api/octokit")
const { sleep } = require('sleepover')

async function run() {
  try {
    const lpath = core.getInput("labels-path") || process.env.LABELS_PATH || ""

    const ljson = require(path.resolve(__dirname, lpath))

    if (!ljson) {
      core.info("Nothing to sync.")
      return
    }

    const { unique, repositories } = ljson

    for await (const { labels, owner, repo } of repositories) {
      const missing = unique.filter(ulabel => {
        return !labels.find(label => label === ulabel.name)
      })

      const updates = missing.map((mlabel) =>{
        const ulabel = unique.find(label => label.name === mlabel)
        createRepoLabel(owner, repo, ulabel)
      })
      await Promise.all(updates)
      sleep(300)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
