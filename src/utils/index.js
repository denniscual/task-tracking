import { basename, join } from 'path'
import isEmpty from 'lodash.isempty'
// for search words
import { createReadStream } from 'fs'
import fastGlob from 'fast-glob'
// for prettier text
import { blue, gray, yellow } from 'colors'

/**
 * Performs right-to-left function composition.
 */
export const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

/**
 * getFileName :: String => String
 *
 * It returns a path which is relative to given pattern path. It removes the cwd (current working directory) path that leave only the necessary path.
 * @param {String} path
 * @return {String} file name
 */
export const getRelativePath = (path) => path.replace(`${process.cwd()}/`, '')

/**
 * removeNull :: Array(a) => Array(a)
 *
 * It remove the included null or empty object element on the array.
 * @param {Array} arr
 * @return {Array} Filtered array.
 */
export const removeNil = (arr) => arr.filter((elem) => !isEmpty(elem))

/**
 * searchWord :: (String, String) => Promise
 *
 * Search the word on the given file. It is case-sensitive search utility.
 * @param {String} word
 * @param {String} path
 * @param {Object} options? where you can control the search mechanism. We can set flags (Regex) and make not case sensitive on the options.
 * @return {Promise}
 *   - Promise resolve type is an object with the included attributes 'matches and count'. If the
 *     given word cannot find in the file, it returns empty object.
 *   - Promise reject type is an instance of Error.
 */
export const searchWord = (word, path, options) => {
  // Handle if the path is a file
  const readerStream = createReadStream(path)

  // Set the encoding to be utf8.
  readerStream.setEncoding('UTF8')

  // Return a promise
  return new Promise((resolve, reject) => {
    // listening to an event data
    readerStream.on('data', (content) => {
      // split the content of the file by newline. Return array of lines(line of strings read in given file)
      const lines = content.split('\n')

      // Transform the elements of lines into object. The object should have properties of
      // text and lineNumber. Use 'map' method for tranforming the lines array. Use the index parameter (add 1 because index is zero-based number) which is passed in 'map' for getting the line number of each line.
      const transformLines = lines.map((line, i) => ({
        text: line,
        lineNumber: i + 1
      }))

      // Filter only the the line which include the found string
      const filteredLines = transformLines
            .filter((line) => line.text.includes(word))

      // Create an object which has attributes of matches and count. Use 'reduce' method
      const result = filteredLines.reduce((acc, line) => {
        const { matches, count } = acc
        // Handle if the matches is defined or undefined. If defined, retain the matches data. Else
        // assign a new array with the line element
        const updatedMatches = matches ? matches.concat(line) : [line]
        // return new acc
        return {
          fileName: getRelativePath(path),
          matches: updatedMatches,
          count: updatedMatches.length
        }
      }, {})

      // pass the result as resolve value
      resolve(result)
    })
    // listening to an event error
    readerStream.on('error', (error) => {
      // pass the error message as reject value
      reject(error.message)
    })
  })
}

/**
 * searchWordInFiles :: (String, String) => Promise
 *
 * Search the word in the files which are resided at the given directory. It recursively reads the nested files (uses fast-glob) for matching files.
 * @param {String} word
 * @param {String} pattern a string value which is used for filtering files.
 * @param {Object} options where you can control the search mechanism. It attributes to make the search as not case-sensitive.
 *                         We can also use this options to skip some files.
 * @return {Promise}
 *   - Promise resolve type is an array of object with the included attributes 'fileName, matches, and count'. If the
 *     given word cannot find in the file, it returns empty array.
 *   - Promise reject type is an instance of Error.
 */
export const searchWordInFiles = (word, pattern, options) => {
  return fastGlob(pattern)
    .then((files) => {
      // get the current working directory
      const cwd = process.cwd()
      // return of array of promises.
      const promises = files.map((file) => {
        // execute the searchWord which returns Promise either resolve or rejected.
        return searchWord(word, join(cwd, file))
      })

      /**
         Returns a single Promise that resolves when all of the promises in the iterable argument have resolved or when the iterable argument contains no promises. It rejects with the reason of the first promise that rejects.
      */
      return Promise
        .all(promises)
        .then(removeNil) // removing null and empty object element
    })
}

/**
 * cleanLineText :: String => String => String
 * 
 * Remove unnecessary characters on the line text to be more readable based on the given command name. The final output is also trimmed.
 * @param {String} cmd is a command name.
 * @param {String} text is a line text
 * @return {String} New text.
 */
const cleanLineText = (cmd) => (text) => {
  // Handle if the command is todo
  if (cmd === 'TODO') {
    return text.replace('// TODO:', '').trim()
  }
  // Handle if the comman is fixme
  return text.replace('// FIXME:', '').trim()
}

/**
 * prettierText :: Array => void
 *
 * Display the results on the console with the pretty format.
 * @param {Array} results
 * @return {Void}
 */
const prettierText = (cmd) => (results) => {
  // iterate to each results
  results.forEach((result) => {
    const { fileName, matches } = result
    // log the filename
    console.info(blue(fileName))
    // iterate to each matches line of strings
    matches.forEach((line) => {
      const coloredLineNumber = gray(`(${line.lineNumber})`)
      const coloredLineText = compose(yellow, cleanLineText(cmd))
      // log the line information
      console.info(`  ${yellow('-')} ${coloredLineText(line.text)} ${coloredLineNumber}`)
    })
  })
}

// action fires when the command todo triggers
export const todoAction = (pattern) => {
  searchWordInFiles('TODO', pattern)
    .then(prettierText('TODO'))
    .catch(console.error)
}

// action fires when the command fixme triggers
export const fixmeAction = (pattern) => {
  searchWordInFiles('FIXME', pattern)
    .then(prettierText('FIXME'))
    .catch(console.error)
}
