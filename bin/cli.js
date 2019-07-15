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

var yargs = _interopDefault(require("yargs")), shelljs = require("shelljs"), findUp = _interopDefault(require("find-up")), path = require("path"), inquirer = require("inquirer"), child_process = require("child_process"), chalk = _interopDefault(require("chalk"));

const loadConfigFile = e => {
    if (!e || !shelljs.test("-f", e)) return defaultConfigValues;
    const a = ".js" === getFileExt(e) ? require(e) : JSON.parse(shelljs.sed(/(\/\*[\w\W]+\*\/|(\/\/.*))/g, "", e));
    return sanityCheck(a) ? {
        ...defaultConfigValues,
        ...a
    } : {
        ...defaultConfigValues
    };
}, loadConfigValues = () => {
    const e = findUp.sync(defaultConfigFileNames) || void 0;
    return loadConfigFile(e);
}, writeConfigFile = ({file: e = defaultConfigFileName, data: a = defaultConfigValues}) => {
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
    return shelljs.ShellString(t).to(e), !0;
}, isValidBranchName = e => checkGitRefFormat(`refs/heads/${e}`), sanityCheck = e => {
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
            break;

          case "tags":
            if ("boolean" != typeof t) return !1;
        }
    }
    return !0;
}, checkGitRefFormat = e => 0 === shelljs.exec(`git check-ref-format "${e}"`, {
    silent: !0
}).code, defaultConfigValues = {
    main: "master",
    usedev: !1,
    development: "develop",
    feature: "feature",
    release: "release",
    hotfix: "hotfix",
    integration: 1,
    interactive: "always",
    push: "always",
    delete: "always",
    tags: !0
}, defaultConfigFileName = "gof.config.js", defaultConfigFileNames = [ defaultConfigFileName, ".gofrc.js", ".gofrc.json" ], getCommentFor = e => {
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

      case "tags":
        return "Automatic tag releases and hotfixes (based on user input, e.g. release/0.2.0 => tag = 0.2.0. Default: `true`";

      default:
        return "";
    }
}, getFileExt = e => path.extname(e), generateCommentedValues = e => {
    const a = [];
    for (const t in e) {
        const r = "string" == typeof e[t] ? `"${e[t]}"` : e[t];
        a.push(`\t/** ${getCommentFor(t)} */\n\t${t}: ${r},`);
    }
    return a;
};

var name = "git-oneflow";

function _defineProperty(e, a, t) {
    return a in e ? Object.defineProperty(e, a, {
        value: t,
        enumerable: !0,
        configurable: !0,
        writable: !0
    }) : e[a] = t, e;
}

class StartFeature {
    constructor() {
        _defineProperty(this, "command", "start <featureBranch>"), _defineProperty(this, "describe", "Start a new feature"), 
        _defineProperty(this, "handler", e => {
            const a = e.usedev ? e.development : e.main;
            isValidBranchName(e.featureBranch) && shelljs.exec(`git checkout -b ${e.feature}/${e.featureBranch} ${a}`);
        });
    }
}

class FinishFeature {
    constructor() {
        _defineProperty(this, "command", "finish <featureBranch> [options]"), _defineProperty(this, "describe", "Finish a feature"), 
        _defineProperty(this, "builder", e => e.option("i", {
            alias: "interactive",
            describe: "Rebase using `rebase -i`. It applies only if `integration` option is set to 1 or 3"
        })), _defineProperty(this, "handler", e => {
            const a = e.usedev ? e.development : e.main;
            if (isValidBranchName(a)) return handleFinish(e, a);
        });
    }
}

async function handleFinish(e, a) {
    2 !== e.integration && await rebaseStep(e, a), shelljs.exec(`git checkout ${a}`);
    let t = "--no-ff";
    switch (2 === e.integration && (t = "--ff-only"), shelljs.exec(`git merge ${t} ${e.feature}/${e.featureBranch}`), 
    e.push) {
      case "always":
        shelljs.exec(`git push origin ${a}`);
        break;

      case "never":
        break;

      case "ask":
        await ask(`Do you want to push to ${a}?`) && shelljs.exec(`git push origin ${a}`);
    }
    switch (e.deleteBranch) {
      case "always":
        shelljs.exec(`git branch -d ${e.feature}/${e.featureBranch}`);
        break;

      case "never":
        break;

      case "ask":
        await ask(`Do you want to delete branch ${e.feature}/${e.featureBranch}?`) && shelljs.exec(`git branch -d ${e.feature}/${e.featureBranch}`);
    }
}

async function rebaseStep(e, a) {
    switch (shelljs.exec(`git checkout ${e.feature}/${e.featureBranch}`), e.interactive) {
      case "always":
        child_process.spawnSync("git", [ "rebase", "-i", `${a}` ], {
            stdio: "inherit"
        });
        break;

      case "never":
        shelljs.exec(`git rebase ${a}`);
        break;

      case "ask":
        await ask("Do you want to use rebase interactively?") ? child_process.spawnSync("git", [ "rebase", "-i", `${a}` ], {
            stdio: "inherit"
        }) : shelljs.exec(`git rebase ${a}`);
    }
}

async function ask(e) {
    return (await inquirer.prompt([ {
        type: "confirm",
        name: "accept",
        message: e
    } ])).accept;
}

class Feature {
    constructor() {
        _defineProperty(this, "command", "feature <command>"), _defineProperty(this, "describe", "Manage starting and finishing features"), 
        _defineProperty(this, "builder", e => e.command(new StartFeature()).command(new FinishFeature())), 
        _defineProperty(this, "handler", () => {});
    }
}

const success = e => chalk.black.bgGreen(e), warning = e => chalk.black.bgYellow(e), error = e => chalk.black.bgRed(e), info = e => chalk.black.bgCyan(e);

class Init {
    constructor() {
        _defineProperty(this, "command", "init [options]"), _defineProperty(this, "describe", "Generate a config file"), 
        _defineProperty(this, "handler", async e => {
            try {
                const a = await inquirer.prompt(generateQuestions(e));
                console.log(JSON.stringify(a, null, 2)), await askConfirmationBeforeWrite() && (writeConfigFile({
                    data: a
                }) ? console.log(success("Initialisation done!")) : console.error(error("Cannot write config file!")));
            } catch (e) {
                console.error(error(e));
            }
        });
    }
}

const generateQuestions = e => [ {
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
}, {
    name: "delete",
    type: "expand",
    message: "Do you want to delete working branch after merging?",
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
}, {
    name: "tags",
    type: "confirm",
    default: e.usedev || !0,
    message: "Do you want automatic tagging of releases/hotfixes?"
} ];

async function askConfirmationBeforeWrite() {
    return (await inquirer.prompt([ {
        type: "confirm",
        name: "write",
        message: "Write to config file?"
    } ])).write;
}

class StartRelease {
    constructor() {
        _defineProperty(this, "command", "start <releaseName> <from>"), _defineProperty(this, "describe", "Start a new release.\n  <releaseName> should be something like `2.3.0`.\n  <from> should be a branch (e.g. develop) or a commit (e.g. 9af345)"), 
        _defineProperty(this, "handler", e => {
            !isValidBranchName(e.releaseName) || e.from && !isValidBranchName(e.from) || shelljs.exec(`git checkout -b ${e.release}/${e.releaseName} ${e.from}`);
        });
    }
}

class FinishRelease {
    constructor() {
        _defineProperty(this, "command", "finish <releaseName>"), _defineProperty(this, "describe", "Finishes a release."), 
        _defineProperty(this, "handler", e => handleFinish$1(e));
    }
}

const handleFinish$1 = async e => {
    const a = e.usedev ? e.development : e.main;
    shelljs.exec(`git checkout ${e.release}/${e.releaseName}`), e.tags && shelljs.exec(`git tag ${e.releaseName}`), 
    shelljs.exec(`git checkout ${a}`), shelljs.exec(`git merge ${e.release}/${e.releaseName}`);
    const t = e.tags ? {
        "--tags": null
    } : {};
    switch (e.push) {
      case "always":
        shelljs.exec(`git push ${t} origin ${a}`);
        break;

      case "never":
        console.log(`Remember to ${info(`git push --tags origin ${a}`)} when you're done.`);
        break;

      case "ask":
        await ask$1(`Do you want to push to ${a}?`) && shelljs.exec(`git push ${t} origin ${a}`);
    }
    switch (e.usedev && (shelljs.exec("git checkout master"), shelljs.exec(`git merge --ff-only ${e.release}/${e.releaseName}`)), 
    e.deleteBranch) {
      case "always":
        await deleteBranch(e);
        break;

      case "never":
        break;

      case "ask":
        await ask$1(`Do you want to delete branch ${e.release}/${e.releaseName}?`) && await deleteBranch(e);
    }
}, deleteBranch = async e => {
    shelljs.exec(`git branch -d ${e.release}/${e.releaseName}`), await ask$1(`Do you want to delete on origin branch ${e.release}/${e.releaseName}?`) && shelljs.exec(`git push origin :${e.release}/${e.releaseName}`);
}, ask$1 = async e => {
    return (await inquirer.prompt([ {
        type: "confirm",
        name: "accept",
        message: e
    } ])).accept;
};

class Release {
    constructor() {
        _defineProperty(this, "command", "release <command>"), _defineProperty(this, "describe", "Manage starting and finishing releases."), 
        _defineProperty(this, "builder", e => e.command(new StartRelease()).command(new FinishRelease())), 
        _defineProperty(this, "handler", () => {});
    }
}

class StartHotfix {
    constructor() {
        _defineProperty(this, "command", "start <hotfixName> <from>"), _defineProperty(this, "describe", "Start a new hotfix.\n  <hotfixName> should be something like `2.3.1`.\n  <from> should be a branch (e.g. develop), a tag (e.g. 2.3.0) or a commit (e.g. 9af345)"), 
        _defineProperty(this, "handler", e => {
            !isValidBranchName(e.hotfixName) || e.from && !isValidBranchName(e.from) || shelljs.exec(`git checkout -b ${e.hotfix}/${e.hotfixName} ${e.from}`);
        });
    }
}

class FinishHotfix {
    constructor() {
        _defineProperty(this, "command", "finish <hotfixName>"), _defineProperty(this, "describe", "Finishes a hotfix."), 
        _defineProperty(this, "handler", e => handleFinish$2(e));
    }
}

const handleFinish$2 = async e => {
    const a = e.usedev ? e.development : e.main;
    shelljs.exec(`git checkout ${e.hotfix}/${e.hotfixName}`), e.tags && shelljs.exec(`git tag ${e.hotfixName}`), 
    shelljs.exec(`git checkout ${a}`), shelljs.exec(`git merge ${e.hotfix}/${e.hotfixName}`);
    const t = e.tags ? {
        "--tags": null
    } : {};
    switch (e.push) {
      case "always":
        shelljs.exec(`git push ${t} origin ${a}`);
        break;

      case "never":
        console.log(`Remember to ${info(`git push --tags origin ${a}`)} when you're done.`);
        break;

      case "ask":
        await ask$2(`Do you want to push to ${a}?`) && shelljs.exec(`git push ${t} origin ${a}`);
    }
    switch (e.usedev && (shelljs.exec("git checkout master"), shelljs.exec(`git merge --ff-only ${e.hotfixName}`)), 
    e.deleteBranch) {
      case "always":
        await deleteBranch$1(e);
        break;

      case "never":
        break;

      case "ask":
        await ask$2(`Do you want to delete branch ${e.hotfix}/${e.hotfixName}?`) && await deleteBranch$1(e);
    }
}, deleteBranch$1 = async e => {
    shelljs.exec(`git branch -d ${e.hotfix}/${e.hotfixName}`), await ask$2(`Do you want to delete on origin branch ${e.hotfix}/${e.hotfixName}?`) && shelljs.exec(`git push origin :${e.hotfix}/${e.hotfixName}`);
}, ask$2 = async e => {
    return (await inquirer.prompt([ {
        type: "confirm",
        name: "accept",
        message: e
    } ])).accept;
};

class Hotfix {
    constructor() {
        _defineProperty(this, "command", "hotfix <command>"), _defineProperty(this, "describe", "Manage starting and finishing hotfixes."), 
        _defineProperty(this, "builder", e => e.command(new StartHotfix()).command(new FinishHotfix())), 
        _defineProperty(this, "handler", () => {});
    }
}

shelljs.which("git") || (console.error(error("Sorry, git-OneFlow requires git... it's in the name")), 
process.exit(1));

const argv = yargs.scriptName(name).version().alias("v", "version").config(loadConfigValues()).pkgConf("git-oneflow").command(new Init()).command(new Feature()).command(new Release()).command(new Hotfix()).help().alias("h", "help").argv;

argv._.length <= 0 && console.log(warning(`Try ${path.basename(process.argv[1])} --help`));
