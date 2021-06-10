const core = require("@actions/core")
const path = require("path")
const { getRepoLabels } = require("./src/api/octokit")
const write = require("./src/utils/write")

async function run() {
  try {
    const lpath = core.getInput("labels-path") || process.env.LABELS_PATH || ""
    const rpath = core.getInput("repositories-json-path") || process.env.REPOSITORIES_JSON_PATH || ""

    const rjson = require(path.resolve(__dirname, rpath))

    const rlist = rjson.map(({ repository }) => repository)

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
      repositories: Object.values(rmap)
    }
    await write(toWrite, lpath)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
