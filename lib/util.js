const fs = require("fs")
const mkdirp = require("mkdirp")
const path = require('path')

const write = async (data, dir, filename, logFn) => {
  await mkdirp(path.resolve(dir))
  return fs.writeFile(
    path.join(dir,filename),
    JSON.stringify(data),
    (error) => {
      if (error) throw error
      return logFn(`File saved at ${dir}${filename}`)
    }
  )
}

module.exports = {
  write
}