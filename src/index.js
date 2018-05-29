#!/usr/bin/env node
import program from 'commander'
import { todoAction, fixmeAction } from './utils'

// add version to cli program
program.version('0.1.0')

// add command for displaying todo list
program
  .command('todo <pattern>') // specify the command name
  .alias('t')
  .action(todoAction)

// add command for displaying fixme list
program
  .command('fixme <pattern>') // specify the command name
  .alias('f')
  .action(fixmeAction)

// parse the cli arg to readable text
program.parse(process.argv)
