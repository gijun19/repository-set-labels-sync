require("dotenv").config()

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

async function getRepoLabels(owner, repo) {
  return octokit.paginate(octokit.issues.listLabelsForRepo, {
    owner,
    repo,
    per_page: 100,
  })
}

module.exports = {
  createRepoLabel,
  getRepoLabels,
}
