#!/usr/bin/env node

/**
 * Copyright (c) 2019 Mirco Sanguineti
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

"use strict";

function _interopDefault(e) {
    return e && "object" == typeof e && "default" in e ? e.default : e;
}

var yargs = _interopDefault(require("yargs")), sh = require("shelljs"), sh__default = _interopDefault(sh), inquirer = _interopDefault(require("inquirer")), findUp = _interopDefault(require("find-up")), path = require("path"), chalk = _interopDefault(require("chalk"));

function getDefaultConfigValues() {
    return {
        ...defaultConfigValues,
        ...loadConfigValues()
    };
}

function loadConfigFile(e) {
    if (!e || !sh__default.test("-f", e)) return defaultConfigValues;
    const a = ".js" === getFileExt(e) ? require(e) : JSON.parse(sh__default.sed(/(\/\*[\w\W]+\*\/|(\/\/.*))/g, "", e));
    return sanityCheck(a) ? {
        ...defaultConfigValues,
        ...a
    } : {
        ...defaultConfigValues
    };
}

function loadConfigValues() {
    return loadConfigFile(findUp.sync(defaultConfigFileNames) || void 0);
}

function writeConfigFile({file: e = defaultConfigFileName, data: a = defaultConfigValues}) {
    let t;
    if (!sanityCheck(a)) return !1;
    switch (getFileExt(e)) {
      case ".js":
        t = [ "module.exports = {", ...generateCommentedValues(a), "}" ].join("\n");
        break;

      case ".json":
        t = JSON.stringify(a, null, 2);
        break;

      default:
        return !1;
    }
    return sh__default.ShellString(t).to(e), !0;
}

function isValidBranchName(e) {
    return checkGitRefFormat(`refs/heads/${e}`);
}

function sanityCheck(e) {
    for (const a in e) {
        const t = e[a];
        switch (a) {
          case "main":
          case "development":
          case "hotfix":
          case "release":
          case "feature":
            if (!isValidBranchName(t)) return !1;
            break;

          case "usedev":
            if ("boolean" != typeof t) return !1;
            break;

          case "integration":
            if ("number" != typeof t || t < 1 || t > 3) return !1;
            break;

          case "interactive":
          case "push":
          case "delete":
            if ("string" != typeof t || !t.match(/(ask|always|never)/)) return !1;
        }
    }
    return !0;
}

function checkGitRefFormat(e) {
    return 0 === sh__default.exec(`git check-ref-format "${e}"`, {
        silent: !0
    }).code;
}

const defaultConfigValues = {
    main: "master",
    usedev: !1,
    development: "develop",
    feature: "feature",
    release: "release",
    hotfix: "hotfix",
    integration: 1,
    interactive: "always",
    push: "always",
    delete: "always"
}, defaultConfigFileName = "gof.config.js", defaultConfigFileNames = [ defaultConfigFileName, ".gofrc.js", ".gofrc.json" ];

function getCommentFor(e) {
    switch (e) {
      case "main":
        return "Main (production) branch name. Default `master`";

      case "usedev":
        return "Use development branch? Default `false`";

      case "development":
        return "Development branch name. Default `develop`";

      case "release":
        return "Release branch name. Default: `release`";

      case "hotfix":
        return "Hotfix branch name. Default: `hotfix`";

      case "feature":
        return "Feature branch name. Default: `feature`";

      case "integration":
        return "Integration method to use (see https://www.endoflineblog.com/oneflow-a-git-branching-model-and-workflow#feature-branches). Options: [`1`, `2`, `3`]. Default: `1`.";

      case "interactive":
        return "Use interactve rebase (`git rebase -i` only valid for integration === 1 || 3)? Options: [`always`, `never`, `ask`]. Default: `always`.";

      case "push":
        return "Push to origin after finishing feature/hotfix/release? Options: [`always`, `never`, `ask`]. Default: `always`.";

      case "delete":
        return "Delete the working branch (feature/hotfix/release) after merging with main/development? Options: [`always`, `never`, `ask`]. Default: `always`.";

      default:
        return "";
    }
}

function getFileExt(e) {
    return path.extname(e);
}

function generateCommentedValues(e) {
    const a = [];
    for (const t in e) {
        const n = "string" == typeof e[t] ? `"${e[t]}"` : e[t];
        a.push(`\t/** ${getCommentFor(t)} */\n\t${t}: ${n},`);
    }
    return a;
}

const success = e => chalk.black.bgGreen(e), error = e => chalk.black.bgRed(e), info = e => chalk.black.bgCyan(e);

var init = {
    command: "init [options]",
    desc: "Generate a config file",
    builder: e => e.option("y", {
        alias: "default-values",
        describe: "Auto-generate config file using default values. These values WILL NOT overwrite existing values!"
    }),
    handler: async function(e) {
        try {
            const a = e.defaultValues ? getDefaultConfigValues() : await inquirer.prompt(generateQuestions(e));
            console.log(JSON.stringify(a, null, 2)), e.dryRun || (e.defaultValues || await askConfirmationBeforeWrite()) && (writeConfigFile({
                data: a
            }) ? console.log(success("Initialisation done!")) : console.error(error("Cannot write config file!")));
        } catch (e) {
            console.error(error(e));
        }
    }
};

function generateQuestions(e) {
    return [ {
        name: "main",
        type: "input",
        message: "Main (production) branch:",
        default: e.main || "master",
        validate: e => isValidBranchName(e) || "Please, choose a valid name for the branch"
    }, {
        name: "usedev",
        type: "confirm",
        default: e.usedev || !1,
        message: "Do you use a development branch?"
    }, {
        name: "development",
        type: "input",
        message: "Development branch:",
        default: e.development || "develop",
        when: function(e) {
            return e.usedev;
        },
        validate: e => isValidBranchName(e) || "Please, choose a valid name for the branch"
    }, {
        name: "feature",
        type: "input",
        message: "Feature branch:",
        default: e.feature || "feature",
        validate: e => isValidBranchName(e) || "Please, choose a valid name for the branch"
    }, {
        name: "release",
        type: "input",
        message: "Release branch:",
        default: e.release || "release",
        validate: e => isValidBranchName(e) || "Please, choose a valid name for the branch"
    }, {
        name: "hotfix",
        type: "input",
        message: "Hotfix branch:",
        default: e.hotfix || "hotfix",
        validate: e => isValidBranchName(e) || "Please, choose a valid name for the branch"
    }, {
        type: "list",
        name: "integration",
        message: "Which feature branch integration method do you want to use?",
        default: e.integration - 1 || 1,
        choices: [ {
            name: "Integrate feature branch with main/development using rebase (rebase -> merge --ff-only).",
            value: 1,
            short: "rebase"
        }, {
            name: "Feature is merged in main/development à la GitFlow (merge --no-ff).",
            value: 2,
            short: "merge --no-ff"
        }, {
            name: "Mix the previous two: rebase and merge (rebase -> merge --no-ff).",
            value: 3,
            short: "rebase + merge --no-ff"
        } ]
    }, {
        name: "interactive",
        type: "expand",
        message: "Do you want to use rebase interactively (rebase -i)?",
        default: e.interactive || "always",
        choices: [ {
            key: "y",
            name: "Always",
            value: "always"
        }, {
            key: "n",
            name: "Never",
            value: "never"
        }, {
            key: "a",
            name: "Ask me every time",
            value: "ask"
        } ],
        when: function(e) {
            return 2 !== e.integration;
        }
    }, {
        name: "push",
        type: "expand",
        message: "Do you want to push to origin after merging?",
        default: e.push || "always",
        choices: [ {
            key: "y",
            name: "Always",
            value: "always"
        }, {
            key: "n",
            name: "Never",
            value: "never"
        }, {
            key: "a",
            name: "Ask me every time",
            value: "ask"
        } ]
    } ];
}

async function askConfirmationBeforeWrite() {
    return (await inquirer.prompt([ {
        type: "confirm",
        name: "write",
        message: "Write to config file?"
    } ])).write;
}

var start = {
    command: "start <featureBranch>",
    desc: "Start a new feature",
    builder: e => {},
    handler: e => {
        const a = e.usedev ? e.development : e.main;
        isValidBranchName(e.featureBranch) && sh.exec(`git checkout -b ${e.feature}/${e.featureBranch} ${a}`);
    }
}, finish = {
    command: "finish <featureBranch> [options]",
    desc: "Finish a feature",
    builder: e => e.option("i", {
        alias: "interactive",
        describe: "Rebase using `rebase -i`. It applies only if `integration` option is set to 1 or 3"
    }),
    handler: e => {
        handleFinish(e, e.usedev ? e.development : e.main);
    }
};

async function handleFinish(e, a) {
    switch (2 !== e.integration && await rebaseStep(e, a), sh.exec(`git checkout ${a}`), 
    2 === e.integration ? sh.exec(`git merge --ff-only ${e.feature}/${e.featureBranch}`) : sh.exec(`git merge --no-ff ${e.feature}/${e.featureBranch}`), 
    e.push) {
      case "always":
        sh.exec(`git push origin ${a}`);
        break;

      case "never":
        break;

      case "ask":
        await ask(`Do you want to push to ${a}?`) && sh.exec(`git push origin ${a}`);
    }
    switch (e.deleteBranch) {
      case "always":
        sh.exec(`git branch -d ${e.feature}/${e.featureBranch}`);
        break;

      case "never":
        break;

      case "ask":
        await ask(`Do you want to delete branch ${e.feature}/${e.featureBranch}?`) && sh.exec(`git branch -d ${e.feature}/${e.featureBranch}`);
    }
}

async function rebaseStep(e, a) {
    switch (sh.exec(`git checkout ${e.feature}/${e.featureBranch}`), e.interactive) {
      case "always":
        sh.exec(`git rebase -i ${a}`);
        break;

      case "never":
        sh.exec(`git rebase ${a}`);
        break;

      case "ask":
        await ask("Do you want to use rebase interactively?") ? sh.exec(`git rebase -i ${a}`) : sh.exec(`git rebase ${a}`);
    }
}

async function ask(e) {
    return (await inquirer.prompt([ {
        type: "confirm",
        name: "accept",
        message: e
    } ])).accept;
}

var feature = {
    command: "feature <command>",
    desc: "Manage starting and finishing features",
    builder: function(e) {
        return e.command(start).command(finish);
    },
    handler: function(e) {}
}, start$1 = {
    command: "start <releaseName> <from>",
    desc: "Start a new release.\n<releaseName> should be something like `2.3.0`.\n<from> should be a branch (e.g. develop) or a commit (e.g. 9af345)",
    builder: e => {},
    handler: e => {
        isValidBranchName(e.releaseName) && sh.exec(`git checkout -b ${e.release}/${e.releaseName} ${e.from}`);
    }
}, finish$1 = {
    command: "finish <releaseName>",
    desc: "Finishes a release.",
    builder: e => {},
    handler: async e => {
        const a = e.usedev ? e.development : e.main;
        switch (sh.exec(`git checkout ${e.release}/${e.releaseName}`), sh.exec(`git tag ${e.releaseName}`), 
        sh.exec(`git checkout ${a}`), sh.exec(`git merge ${e.release}/${e.releaseName}`), 
        e.push) {
          case "always":
            sh.exec(`git push --tags origin ${a}`);
            break;

          case "never":
            console.log(`Remember to ${info(`git push --tags origin ${a}`)} when you're done.`);
            break;

          case "ask":
            await ask$1(`Do you want to push to ${a}?`) && sh.exec(`git push --tags origin ${a}`);
        }
        switch (e.usedev && (sh.exec("git checkout master"), sh.exec(`git merge --ff-only ${e.releaseName}`)), 
        e.deleteBranch) {
          case "always":
            deleteBranch(e);
            break;

          case "never":
            break;

          case "ask":
            await ask$1(`Do you want to delete branch ${e.release}/${e.releaseName}?`) && deleteBranch(e);
        }
    }
};

function deleteBranch(e) {
    sh.exec(`git branch -d ${e.release}/${e.releaseName}`), sh.exec(`git push origin :${e.release}/${e.releaseName}`);
}

async function ask$1(e) {
    return (await inquirer.prompt([ {
        type: "confirm",
        name: "accept",
        message: e
    } ])).accept;
}

var release = {
    command: "release <command>",
    desc: "Manage starting and finishing releases.",
    builder: function(e) {
        return e.command(start$1).command(finish$1);
    },
    handler: function(e) {}
}, start$2 = {
    command: "start <hotfixName> <from>",
    desc: "Start a new hotfix.\n<hotfixName> should be something like `2.3.1`.\n<from> should be a branch (e.g. develop) or a commit (e.g. 9af345)",
    builder: e => {},
    handler: e => {
        isValidBranchName(e.hotfixName) && sh.exec(`git checkout -b ${e.hotfix}/${e.hotfixName} ${e.from}`);
    }
}, finish$2 = {
    command: "finish <hotfixName>",
    desc: "Finishes a hotfix.",
    builder: e => {},
    handler: async e => {
        const a = e.usedev ? e.development : e.main;
        switch (sh.exec(`git checkout ${e.hotfix}/${e.hotfixName}`), sh.exec(`git tag ${e.hotfixName}`), 
        sh.exec(`git checkout ${a}`), sh.exec(`git merge ${e.hotfix}/${e.hotfixName}`), 
        e.push) {
          case "always":
            sh.exec(`git push --tags origin ${a}`);
            break;

          case "never":
            console.log(`Remember to ${info(`git push --tags origin ${a}`)} when you're done.`);
            break;

          case "ask":
            await ask$2(`Do you want to push to ${a}?`) && sh.exec(`git push --tags origin ${a}`);
        }
        switch (e.usedev && (sh.exec("git checkout master"), sh.exec(`git merge --ff-only ${e.hotfixName}`)), 
        e.deleteBranch) {
          case "always":
            deleteBranch$1(e);
            break;

          case "never":
            break;

          case "ask":
            await ask$2(`Do you want to delete branch ${e.hotfix}/${e.hotfixName}?`) && deleteBranch$1(e);
        }
    }
};

function deleteBranch$1(e) {
    sh.exec(`git branch -d ${e.hotfix}/${e.hotfixName}`), sh.exec(`git push origin :${e.hotfix}/${e.hotfixName}`);
}

async function ask$2(e) {
    return (await inquirer.prompt([ {
        type: "confirm",
        name: "accept",
        message: e
    } ])).accept;
}

var hotfix = {
    command: "hotfix <command>",
    desc: "Manage starting and finishing hotfixes.",
    builder: function(e) {
        return e.command(start$2).command(finish$2);
    },
    handler: function(e) {}
}, name = "git-oneflow", version = "0.1.0", description = "CLI tooling implementing GIT OneFlow branching model", bin = {
    gof: "bin/gof.js",
    "git-oneflow": "bin/gof.js"
}, files = [ "bin/**/*" ], scripts = {
    pretest: "run-s typecheck format lint",
    test: "jest",
    clean: "rimraf bin",
    build: "rollup -c",
    format: "prettier --write **/*.ts",
    lint: "standard **/*.ts --fix",
    watch: "rollup -c --watch",
    typecheck: "tsc",
    prerelease: "run-s test clean build",
    release: "standard-version -t"
}, repository = {
    type: "git",
    url: "git+https://github.com/msanguineti/git-oneflow.git"
}, keywords = [ "git", "oneflow", "branching", "model", "Adam", "Ruka" ], author = "Mirco Sanguineti", license = "MIT", bugs = {
    url: "https://github.com/msanguineti/git-oneflow/issues"
}, homepage = "https://github.com/msanguineti/git-oneflow#readme", devDependencies = {
    "@babel/core": "^7.4.3",
    "@babel/plugin-proposal-class-properties": "^7.4.0",
    "@babel/preset-env": "^7.4.3",
    "@babel/preset-typescript": "^7.3.3",
    "@commitlint/cli": "^7.5.2",
    "@commitlint/config-conventional": "^7.5.0",
    "@types/find-up": "^2.1.1",
    "@types/inquirer": "^6.0.0",
    "@types/jest": "^24.0.11",
    "@types/shelljs": "^0.8.5",
    "@typescript-eslint/eslint-plugin": "^1.6.0",
    "@typescript-eslint/parser": "^1.6.0",
    husky: "^1.3.1",
    jest: "^24.7.1",
    "lint-staged": "^8.1.5",
    "npm-run-all": "^4.1.5",
    prettier: "^1.17.0",
    rollup: "^1.10.0",
    "rollup-plugin-babel": "^4.3.2",
    "rollup-plugin-commonjs": "^9.3.4",
    "rollup-plugin-json": "^4.0.0",
    "rollup-plugin-node-resolve": "^4.2.3",
    "rollup-plugin-terser": "^4.0.4",
    standard: "^12.0.1",
    "standard-version": "^5.0.2",
    typescript: "^3.4.3"
}, dependencies = {
    chalk: "^2.4.2",
    "find-up": "^3.0.0",
    inquirer: "^6.3.1",
    shelljs: "^0.8.3",
    yargs: "^13.2.2"
}, standard = {
    parser: "@typescript-eslint/parser",
    plugins: [ "@typescript-eslint" ],
    env: [ "jest" ]
}, prettier = {
    semi: !1,
    singleQuote: !0
}, husky = {
    hooks: {
        "pre-commit": "lint-staged"
    }
}, pkg = {
    name: name,
    version: version,
    description: description,
    bin: bin,
    files: files,
    scripts: scripts,
    repository: repository,
    keywords: keywords,
    author: author,
    license: license,
    bugs: bugs,
    homepage: homepage,
    devDependencies: devDependencies,
    dependencies: dependencies,
    standard: standard,
    prettier: prettier,
    husky: husky,
    "lint-staged": {
        "*.ts": [ "prettier --write", "standard *.ts --fix", "git add" ]
    }
};

sh__default.which("git") || (console.error("Sorry, git-OneFlow requires git... it's in the name"), 
process.exit(1));

var argv = yargs.scriptName(pkg.name).version().alias("v", "version").config(loadConfigValues()).pkgConf("git-oneflow").command(init).command(feature).command(release).command(hotfix).option("x", {
    alias: "dry-run",
    description: "Show what the command would do"
}).help().alias("h", "help").argv;

argv._.length <= 0 && console.log(`Try ${path.basename(process.argv[1])} --help`);