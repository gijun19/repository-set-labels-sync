const path = require("path")
const fs = require("fs")
const mkdirp = require("mkdirp")

const write = async (data, dataDirName = "") => {
  const fpath = await mkdirp(path.resolve(__dirname, dataDirName))
  return fs.writeFile(
    path.resolve(fpath, "labels.json"),
    JSON.stringify(data),
    "utf8"
  )
}

module.exports = write
