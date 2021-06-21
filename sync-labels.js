const core = require("@actions/core")
const path = require("path")
const { sleep } = require("sleepover")

const Rest = require("@octokit/rest")
const { throttling } = require("@octokit/plugin-throttling")
const Octokit = Rest.Octokit.plugin(throttling)

const octokit = new Octokit({
  auth: process.env.AUTH_TOKEN,
  retry: {
    doNotRetry: [404, 422],
  },
  //   log: console,
  request: {
    retries: 1,
    retryAfter: 5,
  },
  throttle: {
    onRateLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`
      )

      if (options.request.retryCount === 0) {
        // only retries once
        octokit.log.info(`Retrying after ${retryAfter} seconds!`)
        return true
      }
    },
    onAbuseLimit: (retryAfter, options, octokit) => {
      // does not retry, only logs a warning
      octokit.log.warn(
        `Abuse detected for request ${options.method} ${options.url}`
      )
    },
  },
})

async function createRepoLabel(owner, repo, label) {
  return octokit.issues.createLabel({
    owner,
    repo,
    name: label.name,
    description: label.description || "",
    color: label.color || "",
  })
}

async function run() {
  try {
    const lpath =
      core.getInput("labels-json-path") || process.env.LABELS_PATH || ""

    const ljson = require(path.resolve(__dirname, lpath))

    if (!ljson) {
      core.info("Nothing to sync.")
      return
    }

    const { unique, repositories } = ljson

    for await (const { labels, owner, repo } of repositories) {
      const missing = unique.filter((ulabel) => {
        return !labels.find((label) => label === ulabel.name)
      })

      const updates = missing.map((mlabel) => {
        const ulabel = unique.find((label) => label.name === mlabel)
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
