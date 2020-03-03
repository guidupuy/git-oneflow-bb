/**
 * Copyright (c) 2019 Mirco Sanguineti
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { exec } from 'shelljs'
import { Arguments, CommandModule } from 'yargs'
import { isValidBranchName, loadConfigFile } from '../../core'

export class StartHotfix implements CommandModule {
  public command = 'start <hotfixName> <from>'

  public describe = `Start a new hotfix.
  <hotfixName> should be something like \`2.3.1\`.
  <from> should be a branch (e.g. develop), a tag (e.g. 2.3.0) or a commit (e.g. 9af345)`

  public handler = (argv: Arguments): void => {
    if (argv.c) loadConfigFile(argv.c as string)

    if (
      isValidBranchName(argv.hotfixName) &&
      (argv.from ? isValidBranchName(argv.from) : true)
    ) {
      exec(`git checkout -b ${argv.hotfix}/${argv.hotfixName} ${argv.from}`)
    }
  }
}
