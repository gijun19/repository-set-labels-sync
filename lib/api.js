const { throttling } = require("@octokit/plugin-throttling")
const core = require("@actions/core")
const { GitHub, getOctokitOptions } = require("@actions/github/lib/utils")
const github = require("@actions/github")
const Octokit = GitHub.plugin(throttling)
const Base64 = require("js-base64")

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

async function commitLabels(data) {
  core.info("Commiting labels JSON.")
  const dataDir = core.getInput("data-directory")
  const filename = core.getInput("labels-filename")
  const content = JSON.stringify(data)
  const encoded = Base64.encode(content)
  const {
    repo: { owner, repo },
    actor,
    ref,
  } = github.context
  let sha
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      ref,
      path: `${dataDir}${filename}`,
    })
    sha = response.data.sha
  } catch (error) {
    sha = null
  }
  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      branch: ref,
      path: `${dataDir}${filename}`,
      message: "chore: update labels JSON",
      content: encoded,
      commiter: {
        name: actor,
        email: `${actor}@users.noreply.github.com`,
      },
      author: {
        name: actor,
        email: `${actor}@users.noreply.github.com`,
      },
      ...(sha ? { sha } : {}),
    })
  } catch (error) {
    core.error("Error updating labels JSON.")
    throw error
  }

  core.info(`Successfully committed labels JSON.`)
}

module.exports = {
  getRepoLabels,
  createRepoLabel,
  commitLabels,
}
