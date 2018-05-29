import { searchWordInFiles } from './utils'

searchWordInFiles('TODO', 'src/**/*.js')
  .then(console.log)
  .catch(console.error)



