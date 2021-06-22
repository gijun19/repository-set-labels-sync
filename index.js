const core = require("@actions/core")
const { write } = require('./lib/util')
const path = require("path")
const { getRepoLabels } = require("./lib/api")

async function run() {
  try {
    const dataDir = core.getInput("data-directory")
    const rfilename = core.getInput("repositories-filename")
    const lfilename = core.getInput("labels-filename")
    core.info(`Reading repositories JSON from ${rfilename}`)
    const rjson = require(path.resolve(dataDir, rfilename))
    const rlist = rjson.map(({ repository }) => repository)
    core.info(`Writing labels for ${rlist.length} repositories.`)
    let rmap = {}
    let lmap = {}
    for await (const r of rlist) {
      try {
        const [owner, repo] = r.split("/").slice(-2)
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
      created_at
    }
    core.info(`Outputting JSON to file: ${JSON.stringify(toWrite)}`)
    await write(toWrite, dataDir, lfilename, core.info)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
