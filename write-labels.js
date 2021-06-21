const core = require("@actions/core")
const path = require("path")
const Rest = require("@octokit/rest")
const { throttling } = require("@octokit/plugin-throttling")
const fs = require("fs")
const mkdirp = require("mkdirp")

const Octokit = Rest.Octokit.plugin(throttling)

// const dirname = path.resolve("./")

const write = async (data, dataDirName = "") => {
  const fpath = await mkdirp(path.resolve(dataDirName))
  return fs.writeFile(
    path.resolve(fpath, "labels.json"),
    JSON.stringify(data),
    "utf8"
  )
}

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

async function getRepoLabels(owner, repo) {
  return octokit.paginate(octokit.issues.listLabelsForRepo, {
    owner,
    repo,
    per_page: 100,
  })
}

async function run() {
  try {
    const lpath =
      core.getInput("labels-json-path") || process.env.LABELS_PATH || ""
    const rpath =
      core.getInput("repositories-json-path") ||
      process.env.REPOSITORIES_JSON_PATH ||
      ""

    core.info(`Reading repositories JSON from ${rpath}`)

    fs.readdirSync('.').forEach(file => core.info(file))

    const rjson = require(path.resolve(rpath))

    const rlist = rjson.map(({ repository }) => repository)

    core.info(`Writing labels for ${rlist.length} repositories.`)
    core.info(`Labels JSON path: ${lpath}`)
    core.info(`Repositories JSON path: ${lpath}`)

    let rmap = {}
    let lmap = {}
    for await (const r of rlist) {
      try {
        const [owner, repo] = r.repository.split("/").slice(-2)
        const labels = await getRepoLabels(owner, repo)
        if (labels.length) {
          rmap[`${owner}/${repo}`] = { labels, owner, repo }
          labels.forEach((label) => {
            const current = lmap[label.name]
            const { name, description, color } = label
            if (!current) {
              lmap[label.name] = {
                name,
                description,
                color,
              }
            }
          })
        }
      } catch (error) {
        core.error(error)
      }
    }

    const data = Object.values(lmap)
    const created_at = new Date().toISOString()

    const toWrite = {
      unique: data,
      created_at,
      repositories: Object.values(rmap),
    }

    core.info(`Outputting JSON to file: ${JSON.stringify(toWrite)}`)
    await write(toWrite, lpath)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
