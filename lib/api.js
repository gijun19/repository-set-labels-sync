const { throttling } = require("@octokit/plugin-throttling")
const core = require("@actions/core")
const { GitHub, getOctokitOptions } = require("@actions/github/lib/utils")

const Octokit = GitHub.plugin(throttling)
const token = core.getInput("token")

const options = {
  log: core,
  retry: {
    doNotRetry: [404, 422],
  },
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
}

const octokit = new Octokit(getOctokitOptions(token, options))

async function getRepoLabels(owner, repo) {
  return octokit.paginate(octokit.rest.issues.listLabelsForRepo, {
    owner,
    repo,
    per_page: 100,
  })
}

async function createRepoLabel(owner, repo, label) {
  return octokit.rest.issues.createLabel({
    owner,
    repo,
    name: label.name,
    description: label.description || "",
    color: label.color || "",
  })
}

module.exports = {
  getRepoLabels,
  createRepoLabel,
}
