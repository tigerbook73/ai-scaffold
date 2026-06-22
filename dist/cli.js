#!/usr/bin/env node
"use strict";

// bin/cli.ts
var import_path3 = require("path");

// node_modules/.pnpm/cac@7.0.0/node_modules/cac/dist/index.js
function toArr(any) {
  return any == null ? [] : Array.isArray(any) ? any : [any];
}
function toVal(out, key, val, opts) {
  var x,
    old = out[key],
    nxt = !!~opts.string.indexOf(key)
      ? val == null || val === true
        ? ""
        : String(val)
      : typeof val === "boolean"
        ? val
        : !!~opts.boolean.indexOf(key)
          ? val === "false"
            ? false
            : val === "true" || (out._.push(((x = +val), x * 0 === 0) ? x : val), !!val)
          : ((x = +val), x * 0 === 0)
            ? x
            : val;
  out[key] = old == null ? nxt : Array.isArray(old) ? old.concat(nxt) : [old, nxt];
}
function lib_default(args, opts) {
  args = args || [];
  opts = opts || {};
  var k,
    arr,
    arg,
    name,
    val,
    out = { _: [] };
  var i = 0,
    j = 0,
    idx = 0,
    len = args.length;
  const alibi = opts.alias !== void 0;
  const strict = opts.unknown !== void 0;
  const defaults = opts.default !== void 0;
  opts.alias = opts.alias || {};
  opts.string = toArr(opts.string);
  opts.boolean = toArr(opts.boolean);
  if (alibi)
    for (k in opts.alias) {
      arr = opts.alias[k] = toArr(opts.alias[k]);
      for (i = 0; i < arr.length; i++) (opts.alias[arr[i]] = arr.concat(k)).splice(i, 1);
    }
  for (i = opts.boolean.length; i-- > 0; ) {
    arr = opts.alias[opts.boolean[i]] || [];
    for (j = arr.length; j-- > 0; ) opts.boolean.push(arr[j]);
  }
  for (i = opts.string.length; i-- > 0; ) {
    arr = opts.alias[opts.string[i]] || [];
    for (j = arr.length; j-- > 0; ) opts.string.push(arr[j]);
  }
  if (defaults)
    for (k in opts.default) {
      name = typeof opts.default[k];
      arr = opts.alias[k] = opts.alias[k] || [];
      if (opts[name] !== void 0) {
        opts[name].push(k);
        for (i = 0; i < arr.length; i++) opts[name].push(arr[i]);
      }
    }
  const keys = strict ? Object.keys(opts.alias) : [];
  for (i = 0; i < len; i++) {
    arg = args[i];
    if (arg === "--") {
      out._ = out._.concat(args.slice(++i));
      break;
    }
    for (j = 0; j < arg.length; j++) if (arg.charCodeAt(j) !== 45) break;
    if (j === 0) out._.push(arg);
    else if (arg.substring(j, j + 3) === "no-") {
      name = arg.substring(j + 3);
      if (strict && !~keys.indexOf(name)) return opts.unknown(arg);
      out[name] = false;
    } else {
      for (idx = j + 1; idx < arg.length; idx++) if (arg.charCodeAt(idx) === 61) break;
      name = arg.substring(j, idx);
      val =
        arg.substring(++idx) ||
        i + 1 === len ||
        ("" + args[i + 1]).charCodeAt(0) === 45 ||
        args[++i];
      arr = j === 2 ? [name] : name;
      for (idx = 0; idx < arr.length; idx++) {
        name = arr[idx];
        if (strict && !~keys.indexOf(name)) return opts.unknown("-".repeat(j) + name);
        toVal(out, name, idx + 1 < arr.length || val, opts);
      }
    }
  }
  if (defaults) {
    for (k in opts.default) if (out[k] === void 0) out[k] = opts.default[k];
  }
  if (alibi)
    for (k in out) {
      arr = opts.alias[k] || [];
      while (arr.length > 0) out[arr.shift()] = out[k];
    }
  return out;
}
function removeBrackets(v) {
  return v.replace(/[<[].+/, "").trim();
}
function findAllBrackets(v) {
  const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g;
  const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g;
  const res = [];
  const parse = (match) => {
    let variadic = false;
    let value = match[1];
    if (value.startsWith("...")) {
      value = value.slice(3);
      variadic = true;
    }
    return {
      required: match[0].startsWith("<"),
      value,
      variadic,
    };
  };
  let angledMatch;
  while ((angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(v))) res.push(parse(angledMatch));
  let squareMatch;
  while ((squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(v))) res.push(parse(squareMatch));
  return res;
}
function getMriOptions(options) {
  const result = {
    alias: {},
    boolean: [],
  };
  for (const [index, option] of options.entries()) {
    if (option.names.length > 1) result.alias[option.names[0]] = option.names.slice(1);
    if (option.isBoolean)
      if (option.negated) {
        if (
          !options.some((o, i) => {
            return (
              i !== index &&
              o.names.some((name) => option.names.includes(name)) &&
              typeof o.required === "boolean"
            );
          })
        )
          result.boolean.push(option.names[0]);
      } else result.boolean.push(option.names[0]);
  }
  return result;
}
function findLongest(arr) {
  return arr.sort((a, b) => {
    return a.length > b.length ? -1 : 1;
  })[0];
}
function padRight(str, length) {
  return str.length >= length ? str : `${str}${" ".repeat(length - str.length)}`;
}
function camelcase(input) {
  return input.replaceAll(/([a-z])-([a-z])/g, (_, p1, p2) => {
    return p1 + p2.toUpperCase();
  });
}
function setDotProp(obj, keys, val) {
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      current[key] = val;
      return;
    }
    if (current[key] == null) {
      const nextKeyIsArrayIndex = +keys[i + 1] > -1;
      current[key] = nextKeyIsArrayIndex ? [] : {};
    }
    current = current[key];
  }
}
function setByType(obj, transforms) {
  for (const key of Object.keys(transforms)) {
    const transform = transforms[key];
    if (transform.shouldTransform) {
      obj[key] = [obj[key]].flat();
      if (typeof transform.transformFunction === "function")
        obj[key] = obj[key].map(transform.transformFunction);
    }
  }
}
function getFileName(input) {
  const m = /([^\\/]+)$/.exec(input);
  return m ? m[1] : "";
}
function camelcaseOptionName(name) {
  return name
    .split(".")
    .map((v, i) => {
      return i === 0 ? camelcase(v) : v;
    })
    .join(".");
}
var CACError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CACError";
    if (typeof Error.captureStackTrace !== "function") this.stack = new Error(message).stack;
  }
};
var Option = class {
  rawName;
  description;
  /** Option name */
  name;
  /** Option name and aliases */
  names;
  isBoolean;
  required;
  config;
  negated;
  constructor(rawName, description, config) {
    this.rawName = rawName;
    this.description = description;
    this.config = Object.assign({}, config);
    rawName = rawName.replaceAll(".*", "");
    this.negated = false;
    this.names = removeBrackets(rawName)
      .split(",")
      .map((v) => {
        let name = v.trim().replace(/^-{1,2}/, "");
        if (name.startsWith("no-")) {
          this.negated = true;
          name = name.replace(/^no-/, "");
        }
        return camelcaseOptionName(name);
      })
      .sort((a, b) => (a.length > b.length ? 1 : -1));
    this.name = this.names.at(-1);
    if (this.negated && this.config.default == null) this.config.default = true;
    if (rawName.includes("<")) this.required = true;
    else if (rawName.includes("[")) this.required = false;
    else this.isBoolean = true;
  }
};
var runtimeProcessArgs;
var runtimeInfo;
if (typeof process !== "undefined") {
  let runtimeName;
  if (typeof Deno !== "undefined" && typeof Deno.version?.deno === "string") runtimeName = "deno";
  else if (typeof Bun !== "undefined" && typeof Bun.version === "string") runtimeName = "bun";
  else runtimeName = "node";
  runtimeInfo = `${process.platform}-${process.arch} ${runtimeName}-${process.version}`;
  runtimeProcessArgs = process.argv;
} else if (typeof navigator === "undefined") runtimeInfo = `unknown`;
else runtimeInfo = `${navigator.platform} ${navigator.userAgent}`;
var Command = class {
  rawName;
  description;
  config;
  cli;
  options;
  aliasNames;
  name;
  args;
  commandAction;
  usageText;
  versionNumber;
  examples;
  helpCallback;
  globalCommand;
  constructor(rawName, description, config = {}, cli2) {
    this.rawName = rawName;
    this.description = description;
    this.config = config;
    this.cli = cli2;
    this.options = [];
    this.aliasNames = [];
    this.name = removeBrackets(rawName);
    this.args = findAllBrackets(rawName);
    this.examples = [];
  }
  usage(text) {
    this.usageText = text;
    return this;
  }
  allowUnknownOptions() {
    this.config.allowUnknownOptions = true;
    return this;
  }
  ignoreOptionDefaultValue() {
    this.config.ignoreOptionDefaultValue = true;
    return this;
  }
  version(version, customFlags = "-v, --version") {
    this.versionNumber = version;
    this.option(customFlags, "Display version number");
    return this;
  }
  example(example) {
    this.examples.push(example);
    return this;
  }
  /**
   * Add a option for this command
   * @param rawName Raw option name(s)
   * @param description Option description
   * @param config Option config
   */
  option(rawName, description, config) {
    const option = new Option(rawName, description, config);
    this.options.push(option);
    return this;
  }
  alias(name) {
    this.aliasNames.push(name);
    return this;
  }
  action(callback) {
    this.commandAction = callback;
    return this;
  }
  /**
   * Check if a command name is matched by this command
   * @param name Command name
   */
  isMatched(name) {
    return this.name === name || this.aliasNames.includes(name);
  }
  get isDefaultCommand() {
    return this.name === "" || this.aliasNames.includes("!");
  }
  get isGlobalCommand() {
    return this instanceof GlobalCommand;
  }
  /**
   * Check if an option is registered in this command
   * @param name Option name
   */
  hasOption(name) {
    name = name.split(".")[0];
    return this.options.find((option) => {
      return option.names.includes(name);
    });
  }
  outputHelp() {
    const { name, commands } = this.cli;
    const { versionNumber, options: globalOptions, helpCallback } = this.cli.globalCommand;
    let sections = [{ body: `${name}${versionNumber ? `/${versionNumber}` : ""}` }];
    sections.push({
      title: "Usage",
      body: `  $ ${name} ${this.usageText || this.rawName}`,
    });
    if ((this.isGlobalCommand || this.isDefaultCommand) && commands.length > 0) {
      const longestCommandName = findLongest(commands.map((command) => command.rawName));
      sections.push(
        {
          title: "Commands",
          body: commands
            .map((command) => {
              return `  ${padRight(command.rawName, longestCommandName.length)}  ${command.description}`;
            })
            .join("\n"),
        },
        {
          title: `For more info, run any command with the \`--help\` flag`,
          body: commands
            .map((command) => `  $ ${name}${command.name === "" ? "" : ` ${command.name}`} --help`)
            .join("\n"),
        },
      );
    }
    let options = this.isGlobalCommand
      ? globalOptions
      : [...this.options, ...(globalOptions || [])];
    if (!this.isGlobalCommand && !this.isDefaultCommand)
      options = options.filter((option) => option.name !== "version");
    if (options.length > 0) {
      const longestOptionName = findLongest(options.map((option) => option.rawName));
      sections.push({
        title: "Options",
        body: options
          .map((option) => {
            return `  ${padRight(option.rawName, longestOptionName.length)}  ${option.description} ${option.config.default === void 0 ? "" : `(default: ${option.config.default})`}`;
          })
          .join("\n"),
      });
    }
    if (this.examples.length > 0)
      sections.push({
        title: "Examples",
        body: this.examples
          .map((example) => {
            if (typeof example === "function") return example(name);
            return example;
          })
          .join("\n"),
      });
    if (helpCallback) sections = helpCallback(sections) || sections;
    console.info(
      sections
        .map((section) => {
          return section.title
            ? `${section.title}:
${section.body}`
            : section.body;
        })
        .join("\n\n"),
    );
  }
  outputVersion() {
    const { name } = this.cli;
    const { versionNumber } = this.cli.globalCommand;
    if (versionNumber) console.info(`${name}/${versionNumber} ${runtimeInfo}`);
  }
  checkRequiredArgs() {
    const minimalArgsCount = this.args.filter((arg) => arg.required).length;
    if (this.cli.args.length < minimalArgsCount)
      throw new CACError(`missing required args for command \`${this.rawName}\``);
  }
  /**
   * Check if the parsed options contain any unknown options
   *
   * Exit and output error when true
   */
  checkUnknownOptions() {
    const { options, globalCommand } = this.cli;
    if (!this.config.allowUnknownOptions) {
      for (const name of Object.keys(options))
        if (name !== "--" && !this.hasOption(name) && !globalCommand.hasOption(name))
          throw new CACError(`Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\``);
    }
  }
  /**
   * Check if the required string-type options exist
   */
  checkOptionValue() {
    const { options: parsedOptions, globalCommand } = this.cli;
    const options = [...globalCommand.options, ...this.options];
    for (const option of options) {
      const value = parsedOptions[option.name.split(".")[0]];
      if (option.required) {
        const hasNegated = options.some((o) => o.negated && o.names.includes(option.name));
        if (value === true || (value === false && !hasNegated))
          throw new CACError(`option \`${option.rawName}\` value is missing`);
      }
    }
  }
  /**
   * Check if the number of args is more than expected
   */
  checkUnusedArgs() {
    const maximumArgsCount = this.args.some((arg) => arg.variadic) ? Infinity : this.args.length;
    if (maximumArgsCount < this.cli.args.length)
      throw new CACError(
        `Unused args: ${this.cli.args
          .slice(maximumArgsCount)
          .map((arg) => `\`${arg}\``)
          .join(", ")}`,
      );
  }
};
var GlobalCommand = class extends Command {
  constructor(cli2) {
    super("@@global@@", "", {}, cli2);
  }
};
var CAC = class extends EventTarget {
  /** The program name to display in help and version message */
  name;
  commands;
  globalCommand;
  matchedCommand;
  matchedCommandName;
  /**
   * Raw CLI arguments
   */
  rawArgs;
  /**
   * Parsed CLI arguments
   */
  args;
  /**
   * Parsed CLI options, camelCased
   */
  options;
  showHelpOnExit;
  showVersionOnExit;
  /**
   * @param name The program name to display in help and version message
   */
  constructor(name = "") {
    super();
    this.name = name;
    this.commands = [];
    this.rawArgs = [];
    this.args = [];
    this.options = {};
    this.globalCommand = new GlobalCommand(this);
    this.globalCommand.usage("<command> [options]");
  }
  /**
   * Add a global usage text.
   *
   * This is not used by sub-commands.
   */
  usage(text) {
    this.globalCommand.usage(text);
    return this;
  }
  /**
   * Add a sub-command
   */
  command(rawName, description, config) {
    const command = new Command(rawName, description || "", config, this);
    command.globalCommand = this.globalCommand;
    this.commands.push(command);
    return command;
  }
  /**
   * Add a global CLI option.
   *
   * Which is also applied to sub-commands.
   */
  option(rawName, description, config) {
    this.globalCommand.option(rawName, description, config);
    return this;
  }
  /**
   * Show help message when `-h, --help` flags appear.
   *
   */
  help(callback) {
    this.globalCommand.option("-h, --help", "Display this message");
    this.globalCommand.helpCallback = callback;
    this.showHelpOnExit = true;
    return this;
  }
  /**
   * Show version number when `-v, --version` flags appear.
   *
   */
  version(version, customFlags = "-v, --version") {
    this.globalCommand.version(version, customFlags);
    this.showVersionOnExit = true;
    return this;
  }
  /**
   * Add a global example.
   *
   * This example added here will not be used by sub-commands.
   */
  example(example) {
    this.globalCommand.example(example);
    return this;
  }
  /**
   * Output the corresponding help message
   * When a sub-command is matched, output the help message for the command
   * Otherwise output the global one.
   *
   */
  outputHelp() {
    if (this.matchedCommand) this.matchedCommand.outputHelp();
    else this.globalCommand.outputHelp();
  }
  /**
   * Output the version number.
   *
   */
  outputVersion() {
    this.globalCommand.outputVersion();
  }
  setParsedInfo({ args, options }, matchedCommand, matchedCommandName) {
    this.args = args;
    this.options = options;
    if (matchedCommand) this.matchedCommand = matchedCommand;
    if (matchedCommandName) this.matchedCommandName = matchedCommandName;
    return this;
  }
  unsetMatchedCommand() {
    this.matchedCommand = void 0;
    this.matchedCommandName = void 0;
  }
  /**
   * Parse argv
   */
  parse(argv, { run = true } = {}) {
    if (!argv) {
      if (!runtimeProcessArgs)
        throw new Error("No argv provided and runtime process argv is not available.");
      argv = runtimeProcessArgs;
    }
    this.rawArgs = argv;
    if (!this.name) this.name = argv[1] ? getFileName(argv[1]) : "cli";
    let shouldParse = true;
    for (const command of this.commands) {
      const parsed = this.mri(argv.slice(2), command);
      const commandName = parsed.args[0];
      if (command.isMatched(commandName)) {
        shouldParse = false;
        const parsedInfo = {
          ...parsed,
          args: parsed.args.slice(1),
        };
        this.setParsedInfo(parsedInfo, command, commandName);
        this.dispatchEvent(new CustomEvent(`command:${commandName}`, { detail: command }));
      }
    }
    if (shouldParse) {
      for (const command of this.commands)
        if (command.isDefaultCommand) {
          shouldParse = false;
          const parsed = this.mri(argv.slice(2), command);
          this.setParsedInfo(parsed, command);
          this.dispatchEvent(new CustomEvent("command:!", { detail: command }));
        }
    }
    if (shouldParse) {
      const parsed = this.mri(argv.slice(2));
      this.setParsedInfo(parsed);
    }
    if (this.options.help && this.showHelpOnExit) {
      this.outputHelp();
      run = false;
      this.unsetMatchedCommand();
    }
    if (this.options.version && this.showVersionOnExit && this.matchedCommandName == null) {
      this.outputVersion();
      run = false;
      this.unsetMatchedCommand();
    }
    const parsedArgv = {
      args: this.args,
      options: this.options,
    };
    if (run) this.runMatchedCommand();
    if (!this.matchedCommand && this.args[0])
      this.dispatchEvent(new CustomEvent("command:*", { detail: this.args[0] }));
    return parsedArgv;
  }
  mri(argv, command) {
    const cliOptions = [...this.globalCommand.options, ...(command ? command.options : [])];
    const mriOptions = getMriOptions(cliOptions);
    let argsAfterDoubleDashes = [];
    const doubleDashesIndex = argv.indexOf("--");
    if (doubleDashesIndex !== -1) {
      argsAfterDoubleDashes = argv.slice(doubleDashesIndex + 1);
      argv = argv.slice(0, doubleDashesIndex);
    }
    let parsed = lib_default(argv, mriOptions);
    parsed = Object.keys(parsed).reduce(
      (res, name) => {
        return {
          ...res,
          [camelcaseOptionName(name)]: parsed[name],
        };
      },
      { _: [] },
    );
    const args = parsed._;
    const options = { "--": argsAfterDoubleDashes };
    const ignoreDefault =
      command && command.config.ignoreOptionDefaultValue
        ? command.config.ignoreOptionDefaultValue
        : this.globalCommand.config.ignoreOptionDefaultValue;
    const transforms = /* @__PURE__ */ Object.create(null);
    for (const cliOption of cliOptions) {
      if (!ignoreDefault && cliOption.config.default !== void 0)
        for (const name of cliOption.names) options[name] = cliOption.config.default;
      if (Array.isArray(cliOption.config.type) && transforms[cliOption.name] === void 0) {
        transforms[cliOption.name] = /* @__PURE__ */ Object.create(null);
        transforms[cliOption.name].shouldTransform = true;
        transforms[cliOption.name].transformFunction = cliOption.config.type[0];
      }
    }
    for (const key of Object.keys(parsed))
      if (key !== "_") {
        setDotProp(options, key.split("."), parsed[key]);
        setByType(options, transforms);
      }
    return {
      args,
      options,
    };
  }
  runMatchedCommand() {
    const { args, options, matchedCommand: command } = this;
    if (!command || !command.commandAction) return;
    command.checkUnknownOptions();
    command.checkOptionValue();
    command.checkRequiredArgs();
    command.checkUnusedArgs();
    const actionArgs = [];
    command.args.forEach((arg, index) => {
      if (arg.variadic) actionArgs.push(args.slice(index));
      else actionArgs.push(args[index]);
    });
    actionArgs.push(options);
    return command.commandAction.apply(this, actionArgs);
  }
};
var cac = (name = "") => new CAC(name);

// global/scripts/installer.ts
var import_fs2 = require("fs");
var import_path2 = require("path");
var import_os = require("os");

// global/scripts/libs/custom-blocks.ts
var CUSTOM_START_RE =
  /^\s*(#|<!--)\s*AISK:CUSTOM\s+name="([^"]+)"\s+status="([^"]+)"\s+hint="([^"]*)".*$/;
var CUSTOM_END_HASH_RE = /^\s*#\s*AISK:CUSTOM:END/;
var CUSTOM_END_HTML_RE = /^\s*<!--\s*AISK:CUSTOM:END/;
function parseCustomBlocks(content) {
  const lines = content.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const m = CUSTOM_START_RE.exec(lines[i]);
    if (m) {
      const commentStyle = m[1];
      const name = m[2];
      const status = m[3];
      const hint = m[4];
      const startLine = i;
      const endRe = commentStyle === "#" ? CUSTOM_END_HASH_RE : CUSTOM_END_HTML_RE;
      const contentLines = [];
      i++;
      while (i < lines.length && !endRe.test(lines[i])) {
        contentLines.push(lines[i]);
        i++;
      }
      blocks.push({ name, status, hint, startLine, endLine: i, content: contentLines });
    }
    i++;
  }
  return blocks;
}
function mergeCustomContent(oldContent, newTemplate) {
  const oldBlocks = parseCustomBlocks(oldContent);
  const doneMap = /* @__PURE__ */ new Map();
  for (const b of oldBlocks) {
    if (b.status === "done") doneMap.set(b.name, b.content);
  }
  if (doneMap.size === 0) return newTemplate;
  const lines = newTemplate.split("\n");
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const m = CUSTOM_START_RE.exec(lines[i]);
    if (m) {
      const commentStyle = m[1];
      const name = m[2];
      const endRe = commentStyle === "#" ? CUSTOM_END_HASH_RE : CUSTOM_END_HTML_RE;
      const doneContent = doneMap.get(name);
      const newStatus = doneContent ? "done" : "todo";
      result.push(lines[i].replace(/status="[^"]+"/, `status="${newStatus}"`));
      if (doneContent) {
        i++;
        while (i < lines.length && !endRe.test(lines[i])) i++;
        result.push(...doneContent);
      } else {
        i++;
        while (i < lines.length && !endRe.test(lines[i])) {
          result.push(lines[i]);
          i++;
        }
      }
      if (i < lines.length) result.push(lines[i]);
    } else {
      result.push(lines[i]);
    }
    i++;
  }
  return result.join("\n");
}

// global/scripts/libs/precommit-lefthook.ts
var import_fs = require("fs");
var import_path = require("path");
function getPreCommitBounds(lines) {
  const start = lines.findIndex((l) => /^pre-commit:/.test(l));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && (lines[end].startsWith(" ") || lines[end] === "")) {
    end++;
  }
  return { start, end };
}
function addPreCommitHook(projectDir, commandName, runCommand) {
  const lefthookPath = (0, import_path.join)(projectDir, "lefthook.yml");
  const commandLines = [`    ${commandName}:`, `      run: ${runCommand}`];
  if (!(0, import_fs.existsSync)(lefthookPath)) {
    (0, import_fs.writeFileSync)(
      lefthookPath,
      `pre-commit:
  commands:
${commandLines.join("\n")}
`,
    );
    return;
  }
  const content = (0, import_fs.readFileSync)(lefthookPath, "utf8").replace(/\r\n/g, "\n");
  const lines = content.split("\n");
  const bounds = getPreCommitBounds(lines);
  if (!bounds) {
    const suffix = content.endsWith("\n") ? "" : "\n";
    (0, import_fs.writeFileSync)(
      lefthookPath,
      `${content}${suffix}
pre-commit:
  commands:
${commandLines.join("\n")}
`,
    );
    return;
  }
  const section = lines.slice(bounds.start, bounds.end);
  const existingRelIdx = section.findIndex((l) => l === `    ${commandName}:`);
  if (existingRelIdx !== -1) {
    const startIdx = bounds.start + existingRelIdx;
    for (let i = startIdx + 1; i < bounds.end; i++) {
      if (!lines[i].startsWith("      ")) break;
      if (/^      run:/.test(lines[i])) {
        lines[i] = `      run: ${runCommand}`;
        (0, import_fs.writeFileSync)(lefthookPath, lines.join("\n"));
        return;
      }
    }
    return;
  }
  const commandsRelIdx = section.findIndex((l) => /^  commands:/.test(l));
  if (commandsRelIdx === -1) {
    lines.splice(bounds.start + 1, 0, "  commands:", ...commandLines);
  } else {
    let insertIdx = bounds.end;
    while (insertIdx > bounds.start + commandsRelIdx + 1 && lines[insertIdx - 1] === "") {
      insertIdx--;
    }
    lines.splice(insertIdx, 0, ...commandLines);
  }
  (0, import_fs.writeFileSync)(lefthookPath, lines.join("\n"));
}
function removePreCommitHook(projectDir, commandName) {
  const lefthookPath = (0, import_path.join)(projectDir, "lefthook.yml");
  if (!(0, import_fs.existsSync)(lefthookPath)) return;
  const lines = (0, import_fs.readFileSync)(lefthookPath, "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const bounds = getPreCommitBounds(lines);
  if (!bounds) return;
  const commandLine = `    ${commandName}:`;
  const relIdx = lines.slice(bounds.start, bounds.end).findIndex((l) => l === commandLine);
  if (relIdx === -1) return;
  const startIdx = bounds.start + relIdx;
  let endIdx = startIdx + 1;
  while (endIdx < bounds.end && (lines[endIdx].startsWith("      ") || lines[endIdx] === "")) {
    endIdx++;
  }
  lines.splice(startIdx, endIdx - startIdx);
  (0, import_fs.writeFileSync)(lefthookPath, lines.join("\n"));
}

// global/scripts/installer.ts
var Installer = class {
  /**
   * @param cwd      Project root to install units into (defaults to process.cwd()).
   * @param aiskHome Global aisk home directory (defaults to ~/.aisk).
   * @param human    When true, output human-readable text instead of JSON.
   */
  constructor(
    cwd = process.cwd(),
    aiskHome = (0, import_path2.join)((0, import_os.homedir)(), ".aisk"),
    human = false,
  ) {
    this.cwd = cwd;
    this.aiskHome = aiskHome;
    this.human = human;
  }
  // ─── Public API ────────────────────────────────────────────────────────────
  /** List all available units with their install and customization status. */
  list() {
    this.refresh(true);
    const installed = this.readInstalled();
    const unitList = this.getUnitList();
    const units = unitList.map((u) => {
      const entry = installed.units[u.name];
      const hasTodo = entry
        ? [
            ...entry.components.skills,
            ...entry.components.rules,
            ...entry.components.resources,
          ].some((c) => c.customStatus === "todo")
        : void 0;
      return {
        name: u.name,
        description: u.description,
        installed: u.installed,
        ...(hasTodo ? { hasTodo: true } : {}),
      };
    });
    const result = { units };
    if (this.human) {
      this.printListHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }
  /**
   * Add one or more units. "all" installs all available units.
   * If a unit is already installed, it is updated instead.
   * Transitive dependencies that are not installed are auto-installed.
   */
  add(names) {
    this.refresh(true);
    const installed = this.readInstalled();
    const available = this.getUnitList().map((u) => u.name);
    const availableSet = new Set(available);
    const requestedNames = names.includes("all")
      ? available.filter((n) => !installed.units[n])
      : names;
    const result = { added: [], updated: [], failed: [] };
    const toInstall = [];
    const toUpdate = [];
    for (const name of requestedNames) {
      if (!availableSet.has(name)) {
        result.failed.push({ name, reason: "unit \u4E0D\u5728\u6CE8\u518C\u8868\u4E2D" });
        continue;
      }
      if (installed.units[name]) {
        toUpdate.push(name);
      } else {
        toInstall.push(name);
      }
    }
    const { order, autoDeps } = this.resolveFreshDeps(
      toInstall,
      new Set(Object.keys(installed.units)),
      result,
    );
    for (const name of order) {
      try {
        const comps = this.installUnitAllComponents(name);
        result.added.push({ name, autoDep: autoDeps.has(name), components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }
    for (const name of toUpdate) {
      try {
        const comps = this.updateUnitComponents(name);
        result.updated.push({ name, components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }
    if (this.human) {
      this.printAddHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }
  /**
   * Remove one or more installed units. "all" removes all installed units.
   * Fails per-unit if not installed.
   */
  remove(names) {
    this.refresh(true);
    const installed = this.readInstalled();
    const requestedNames = names.includes("all") ? Object.keys(installed.units) : names;
    const result = { removed: [], failed: [] };
    for (const name of requestedNames) {
      if (!installed.units[name]) {
        result.failed.push({ name, reason: "unit \u672A\u5B89\u88C5" });
        continue;
      }
      try {
        const comps = this.removeUnitComponents(name);
        result.removed.push({ name, components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }
    if (this.human) {
      this.printRemoveHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }
  /**
   * Update one or more installed units. "all" updates all installed units.
   * Fails per-unit if not installed. Optional components that are not on disk are skipped.
   * AISK:CUSTOM done blocks are merged into the new template.
   */
  update(names) {
    this.refresh(true);
    const installed = this.readInstalled();
    const availableSet = new Set(this.getUnitList().map((u) => u.name));
    const requestedNames = names.includes("all") ? Object.keys(installed.units) : names;
    const result = { updated: [], failed: [] };
    for (const name of requestedNames) {
      if (!installed.units[name]) {
        result.failed.push({ name, reason: "unit \u672A\u5B89\u88C5" });
        continue;
      }
      if (!availableSet.has(name)) {
        result.failed.push({ name, reason: "unit \u4E0D\u5728\u6CE8\u518C\u8868\u4E2D" });
        continue;
      }
      try {
        const comps = this.updateUnitComponents(name);
        result.updated.push({ name, components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }
    if (this.human) {
      this.printUpdateHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }
  /**
   * Scan all installed component files for AISK:CUSTOM block status,
   * sync customStatus back to installed.json, and clean up orphaned hooks.
   * In silent mode (internal calls), produces no output.
   */
  refresh(silent = false) {
    const installed = this.readInstalled();
    const todoUnits = [];
    let anyChanged = false;
    for (const [unitName, entry] of Object.entries(installed.units)) {
      const todoFiles = [];
      let changed = false;
      for (const compList of [
        entry.components.skills,
        entry.components.rules,
        entry.components.resources,
      ]) {
        for (const comp of compList) {
          const absPath = (0, import_path2.join)(this.cwd, comp.path);
          if (!(0, import_fs2.existsSync)(absPath)) {
            if (comp.customStatus !== void 0) {
              comp.customStatus = void 0;
              changed = true;
            }
            continue;
          }
          const scanned = this.scanCustomStatus(absPath);
          if (scanned !== comp.customStatus) {
            comp.customStatus = scanned;
            changed = true;
          }
          if (scanned === "todo") {
            todoFiles.push(comp.path);
          }
        }
      }
      for (const comp of entry.components.scripts) {
        const absPath = (0, import_path2.join)(this.cwd, comp.path);
        if (!(0, import_fs2.existsSync)(absPath)) {
          removePreCommitHook(this.cwd, `aisk-${unitName}-${comp.name}`);
        }
      }
      if (changed) anyChanged = true;
      if (todoFiles.length > 0) {
        todoUnits.push({ unit: unitName, files: todoFiles });
      }
    }
    const installedPath = (0, import_path2.join)(this.cwd, ".aisk", "installed.json");
    if (anyChanged && (0, import_fs2.existsSync)(installedPath)) {
      (0, import_fs2.writeFileSync)(installedPath, JSON.stringify(installed, null, 2) + "\n");
    }
    if (!silent) {
      const refreshResult = { todo: todoUnits };
      if (this.human) {
        this.printRefreshHuman(refreshResult);
      } else {
        process.stdout.write(JSON.stringify(refreshResult, null, 2) + "\n");
      }
    }
  }
  /** Show details for a single unit including component status. */
  show(unitName) {
    const unitJson = this.readUnitJson(unitName);
    if (!unitJson) {
      console.error(`Error: unit "${unitName}" not found in ~/.aisk/units/`);
      process.exit(1);
    }
    const installed = this.readInstalled();
    const entry = installed.units[unitName];
    const components = [];
    for (const comp of unitJson.components.skills ?? []) {
      const ic = entry?.components.skills.find((c) => c.name === comp.name);
      components.push({
        type: "skill",
        name: comp.name,
        optional: !!comp.condition,
        condition: comp.condition,
        customStatus: ic?.customStatus,
        installed: !!ic,
      });
    }
    for (const comp of unitJson.components.rules ?? []) {
      const ic = entry?.components.rules.find((c) => c.name === comp.name);
      components.push({
        type: "rule",
        name: comp.name,
        optional: !!comp.condition,
        condition: comp.condition,
        customStatus: ic?.customStatus,
        installed: !!ic,
      });
    }
    for (const comp of unitJson.components.scripts ?? []) {
      const ic = entry?.components.scripts.find((c) => c.name === comp.name);
      components.push({
        type: "script",
        name: comp.name,
        optional: false,
        hook: comp.hook,
        installed: !!ic,
      });
    }
    for (const comp of unitJson.components.resources ?? []) {
      const ic = entry?.components.resources.find((c) => c.name === comp.name);
      components.push({
        type: "resource",
        name: comp.name,
        optional: !!comp.condition,
        condition: comp.condition,
        customStatus: ic?.customStatus,
        installed: !!ic,
      });
    }
    const result = {
      name: unitName,
      description: unitJson.description ?? "",
      dependencies: unitJson.dependencies,
      installed: !!entry,
      components,
    };
    if (this.human) {
      this.printShowHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }
  /**
   * Computes the full changeset for the given desired state and outputs it as JSON.
   * The desired state is the complete list of unit names the user wants installed.
   */
  resolve(selectedNames) {
    const result = this.resolveDeps(selectedNames);
    if (this.human) {
      this.printResolveHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }
  /** Reads and parses .aisk/installed.json from the project directory. */
  readInstalled() {
    const installedPath = (0, import_path2.join)(this.cwd, ".aisk", "installed.json");
    if (!(0, import_fs2.existsSync)(installedPath)) return { units: {} };
    return JSON.parse((0, import_fs2.readFileSync)(installedPath, "utf8"));
  }
  // ─── Unit-level operations ─────────────────────────────────────────────────
  /**
   * Install a unit with ALL components (required + optional).
   * Copies files directly from templates; scans AISK:CUSTOM blocks for customStatus.
   */
  installUnitAllComponents(unitName) {
    const unitJson = this.readUnitJson(unitName);
    const specs = this.resolveComponents(unitJson, null);
    const comps = {
      skills: [],
      rules: [],
      scripts: [],
      resources: [],
    };
    const results = [];
    for (const spec of specs) {
      switch (spec.type) {
        case "skill": {
          const ic = this.copyComponentDirect(
            (0, import_path2.join)(this.aiskHome, "units", unitName, spec.file),
            (0, import_path2.join)(
              this.cwd,
              ".claude",
              "skills",
              `aisk-${unitName}-${spec.name}`,
              "SKILL.md",
            ),
            spec.name,
            spec.hasCustom,
          );
          comps.skills.push(ic);
          results.push({
            type: "skill",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
          });
          break;
        }
        case "rule": {
          const ic = this.copyComponentDirect(
            (0, import_path2.join)(this.aiskHome, "units", unitName, spec.file),
            (0, import_path2.join)(
              this.cwd,
              ".claude",
              "rules",
              `aisk-${unitName}`,
              `${spec.name}.md`,
            ),
            spec.name,
            spec.hasCustom,
          );
          comps.rules.push(ic);
          results.push({
            type: "rule",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
            optional: spec.optional,
          });
          break;
        }
        case "script": {
          const ic = this.installScript(unitName, spec);
          comps.scripts.push(ic);
          results.push({ type: "script", name: spec.name, path: ic.path, hook: spec.hook });
          break;
        }
        case "resource": {
          const ic = this.copyComponentDirect(
            (0, import_path2.join)(this.aiskHome, "units", unitName, spec.file),
            (0, import_path2.join)(this.cwd, ".aisk", unitName, spec.file),
            spec.name,
            spec.hasCustom,
          );
          comps.resources.push(ic);
          results.push({
            type: "resource",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
            optional: spec.optional,
          });
          break;
        }
      }
    }
    this.updateInstalled(unitName, comps);
    this.ensureGitignores();
    return results;
  }
  /**
   * Update an installed unit.
   * Optional components: checked by file existence; skipped if not on disk.
   * hasCustom components: done blocks merged from existing file into new template.
   */
  updateUnitComponents(unitName) {
    const unitJson = this.readUnitJson(unitName);
    const entry = this.readInstalled().units[unitName];
    const installedOptionals = this.getInstalledOptionalNames(unitJson, entry);
    const specs = this.resolveComponents(unitJson, installedOptionals);
    this.removeOrphans(unitName, unitJson, installedOptionals);
    const comps = {
      skills: [],
      rules: [],
      scripts: [],
      resources: [],
    };
    const results = [];
    for (const spec of specs) {
      switch (spec.type) {
        case "skill": {
          const destFile = (0, import_path2.join)(
            this.cwd,
            ".claude",
            "skills",
            `aisk-${unitName}-${spec.name}`,
            "SKILL.md",
          );
          const existingPath = entry?.components.skills.find((c) => c.name === spec.name)?.path;
          const ic = this.updateComponentDirect(
            (0, import_path2.join)(this.aiskHome, "units", unitName, spec.file),
            destFile,
            spec.name,
            spec.hasCustom,
            existingPath ? (0, import_path2.join)(this.cwd, existingPath) : void 0,
          );
          comps.skills.push(ic);
          results.push({
            type: "skill",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
          });
          break;
        }
        case "rule": {
          const destFile = (0, import_path2.join)(
            this.cwd,
            ".claude",
            "rules",
            `aisk-${unitName}`,
            `${spec.name}.md`,
          );
          const existingPath = entry?.components.rules.find((c) => c.name === spec.name)?.path;
          const ic = this.updateComponentDirect(
            (0, import_path2.join)(this.aiskHome, "units", unitName, spec.file),
            destFile,
            spec.name,
            spec.hasCustom,
            existingPath ? (0, import_path2.join)(this.cwd, existingPath) : void 0,
          );
          comps.rules.push(ic);
          results.push({
            type: "rule",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
            optional: spec.optional,
          });
          break;
        }
        case "script": {
          const ic = this.installScript(unitName, spec);
          comps.scripts.push(ic);
          results.push({ type: "script", name: spec.name, path: ic.path, hook: spec.hook });
          break;
        }
        case "resource": {
          const destFile = (0, import_path2.join)(this.cwd, ".aisk", unitName, spec.file);
          const existingPath = entry?.components.resources.find((c) => c.name === spec.name)?.path;
          const ic = this.updateComponentDirect(
            (0, import_path2.join)(this.aiskHome, "units", unitName, spec.file),
            destFile,
            spec.name,
            spec.hasCustom,
            existingPath ? (0, import_path2.join)(this.cwd, existingPath) : void 0,
          );
          comps.resources.push(ic);
          results.push({
            type: "resource",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
            optional: spec.optional,
          });
          break;
        }
      }
    }
    this.updateInstalled(unitName, comps);
    this.ensureGitignores();
    return results;
  }
  /** Remove all components of an installed unit and clean up hooks. */
  removeUnitComponents(unitName) {
    const installed = this.readInstalled();
    const entry = installed.units[unitName];
    const results = [];
    for (const comp of [
      ...entry.components.skills,
      ...entry.components.rules,
      ...entry.components.resources,
    ]) {
      const fullPath = (0, import_path2.join)(this.cwd, comp.path);
      if ((0, import_fs2.existsSync)(fullPath)) {
        (0, import_fs2.rmSync)(fullPath);
        this.tryRemoveEmptyDir(fullPath);
      }
      results.push({ type: "skill", name: comp.name, path: comp.path });
    }
    for (const comp of entry.components.scripts) {
      removePreCommitHook(this.cwd, `aisk-${unitName}-${comp.name}`);
      const fullPath = (0, import_path2.join)(this.cwd, comp.path);
      if ((0, import_fs2.existsSync)(fullPath)) {
        (0, import_fs2.rmSync)(fullPath);
        this.tryRemoveEmptyDir(fullPath);
      }
      results.push({ type: "script", name: comp.name, path: comp.path });
    }
    delete installed.units[unitName];
    (0, import_fs2.writeFileSync)(
      (0, import_path2.join)(this.cwd, ".aisk", "installed.json"),
      JSON.stringify(installed, null, 2) + "\n",
    );
    return results;
  }
  // ─── Component-level copy/update ───────────────────────────────────────────
  /**
   * Copy a file directly from src to dest, creating parent dirs.
   * If hasCustom, scans dest for AISK:CUSTOM block status after copy.
   */
  copyComponentDirect(src, dest, compName, hasCustom) {
    if (!(0, import_fs2.existsSync)(src)) throw new Error(`source file not found: ${src}`);
    (0, import_fs2.mkdirSync)((0, import_path2.dirname)(dest), { recursive: true });
    (0, import_fs2.cpSync)(src, dest);
    const path = (0, import_path2.relative)(this.cwd, dest);
    const customStatus = hasCustom ? this.scanCustomStatus(dest) : void 0;
    return { name: compName, path, customStatus };
  }
  /**
   * Update a component file, merging AISK:CUSTOM done blocks from the existing file.
   * Falls back to direct copy if the file doesn't exist yet or has no done blocks.
   */
  updateComponentDirect(src, dest, compName, hasCustom, existingFilePath) {
    if (!(0, import_fs2.existsSync)(src)) throw new Error(`source file not found: ${src}`);
    (0, import_fs2.mkdirSync)((0, import_path2.dirname)(dest), { recursive: true });
    const currentPath = existingFilePath ?? dest;
    if (hasCustom && (0, import_fs2.existsSync)(currentPath)) {
      const oldContent = (0, import_fs2.readFileSync)(currentPath, "utf8");
      const newTemplate = (0, import_fs2.readFileSync)(src, "utf8");
      const merged = mergeCustomContent(oldContent, newTemplate);
      (0, import_fs2.writeFileSync)(dest, merged);
    } else {
      (0, import_fs2.cpSync)(src, dest);
    }
    const path = (0, import_path2.relative)(this.cwd, dest);
    const customStatus = hasCustom ? this.scanCustomStatus(dest) : void 0;
    return { name: compName, path, customStatus };
  }
  /**
   * Copy a compiled script to .aisk/{unit}/scripts/ and register its hook.
   */
  installScript(unitName, spec) {
    const srcJs = (0, import_path2.join)(
      this.aiskHome,
      "units",
      unitName,
      "scripts",
      `${spec.name}.cjs`,
    );
    if (!(0, import_fs2.existsSync)(srcJs)) throw new Error(`compiled script not found: ${srcJs}`);
    const destDir = (0, import_path2.join)(this.cwd, ".aisk", unitName, "scripts");
    (0, import_fs2.mkdirSync)(destDir, { recursive: true });
    const destFile = (0, import_path2.join)(destDir, `${spec.name}.cjs`);
    (0, import_fs2.cpSync)(srcJs, destFile);
    const relPath = (0, import_path2.join)(".aisk", unitName, "scripts", `${spec.name}.cjs`);
    if (spec.hook) {
      const paramStr = (spec.params ?? []).map((p) => `{${p}}`).join(" ");
      const runCmd = paramStr ? `node ${relPath} ${paramStr}` : `node ${relPath}`;
      addPreCommitHook(this.cwd, `aisk-${unitName}-${spec.name}`, runCmd);
    }
    return { name: spec.name, path: relPath };
  }
  // ─── Dependency resolution ─────────────────────────────────────────────────
  /**
   * Resolve transitive deps for a fresh-install list.
   * Only adds uninstalled deps; already-installed deps are silently skipped.
   * Failed lookups are pushed to result.failed and excluded from order.
   */
  resolveFreshDeps(names, installedSet, result) {
    const toInstall = new Set(names);
    const autoDeps = /* @__PURE__ */ new Set();
    const expand = (name) => {
      const unitJson = this.readUnitJson(name);
      if (!unitJson) {
        result.failed.push({ name, reason: "unit \u4E0D\u5728\u6CE8\u518C\u8868\u4E2D" });
        toInstall.delete(name);
        return;
      }
      for (const dep of unitJson.dependencies) {
        if (!installedSet.has(dep) && !toInstall.has(dep)) {
          toInstall.add(dep);
          autoDeps.add(dep);
          expand(dep);
        }
      }
    };
    for (const name of [...names]) expand(name);
    const order = this.sortByGlobalOrder([...toInstall]);
    return { order, autoDeps };
  }
  /**
   * Full dep resolution for resolve command using a desired-state model.
   *
   * The selected names represent the complete target state. Any currently
   * installed unit outside the transitive closure becomes a removal candidate.
   */
  resolveDeps(selectedNames) {
    const installed = this.readInstalled();
    const installedNames = new Set(Object.keys(installed.units));
    const selectedSet = new Set(selectedNames);
    const fullRequired = new Set(selectedNames);
    const auto = /* @__PURE__ */ new Set();
    const resolveTransitive = (names) => {
      for (const name of names) {
        const unitJson = this.readUnitJson(name);
        if (!unitJson) {
          console.error(`Error: unit "${name}" not found in ~/.aisk/units/`);
          process.exit(1);
        }
        for (const dep of unitJson.dependencies) {
          if (!fullRequired.has(dep)) {
            fullRequired.add(dep);
            if (!selectedSet.has(dep)) auto.add(dep);
            resolveTransitive([dep]);
          }
        }
      }
    };
    resolveTransitive(selectedNames);
    const globalOrder = this.readGlobalOrder();
    const sort = (ns) => this.sortByGlobalOrder(ns, globalOrder);
    const to_remove = sort([...installedNames].filter((n) => !fullRequired.has(n)));
    const to_install = sort([...fullRequired].filter((n) => !installedNames.has(n)));
    const to_update = sort(selectedNames.filter((n) => installedNames.has(n)));
    const order = sort([...to_install, ...to_update]);
    return { to_remove, to_install, to_update, order, auto: sort([...auto]) };
  }
  // ─── Optional component helpers ────────────────────────────────────────────
  /** Return typed names for optional components recorded in installed.json for this unit. */
  getInstalledOptionalNames(unitJson, entry) {
    const names = [];
    for (const c of unitJson.components.skills ?? []) {
      if (c.condition && entry.components.skills.some((ic) => ic.name === c.name)) {
        names.push(`skill:${c.name}`);
      }
    }
    for (const c of unitJson.components.rules ?? []) {
      if (c.condition && entry.components.rules.some((ic) => ic.name === c.name)) {
        names.push(`rule:${c.name}`);
      }
    }
    for (const c of unitJson.components.resources ?? []) {
      if (c.condition && entry.components.resources.some((ic) => ic.name === c.name)) {
        names.push(`resource:${c.name}`);
      }
    }
    return names;
  }
  // ─── Component resolution & orphan removal ─────────────────────────────────
  /**
   * Resolve unit.json component declarations into concrete install specs.
   *
   * optionalNames === null means fresh install and includes all optional
   * components; otherwise only recorded optional components are preserved.
   */
  resolveComponents(unitJson, optionalNames) {
    const selected = (key) => optionalNames === null || optionalNames.includes(key);
    const specs = [];
    for (const comp of unitJson.components.skills ?? []) {
      if (!comp.condition || selected(`skill:${comp.name}`)) {
        specs.push({
          type: "skill",
          name: comp.name,
          file: comp.file,
          hasCustom: comp.hasCustom,
          optional: !!comp.condition,
        });
      }
    }
    for (const comp of unitJson.components.rules ?? []) {
      if (!comp.condition || selected(`rule:${comp.name}`)) {
        specs.push({
          type: "rule",
          name: comp.name,
          file: comp.file,
          hasCustom: comp.hasCustom,
          hint: comp.hint,
          optional: !!comp.condition,
        });
      }
    }
    for (const comp of unitJson.components.scripts ?? []) {
      specs.push({
        type: "script",
        name: comp.name,
        file: comp.file,
        hook: comp.hook,
        params: comp.params,
      });
    }
    for (const comp of unitJson.components.resources ?? []) {
      if (!comp.condition || selected(`resource:${comp.name}`)) {
        specs.push({
          type: "resource",
          name: comp.name,
          file: comp.file,
          hasCustom: comp.hasCustom,
          optional: !!comp.condition,
        });
      }
    }
    return specs;
  }
  /** Remove files and hooks that existed in installed.json but no longer resolve from unit.json. */
  removeOrphans(unitName, unitJson, optionalNames) {
    const installed = this.readInstalled();
    const entry = installed.units[unitName];
    if (!entry) return;
    const newSkillNames = new Set(
      (unitJson.components.skills ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`skill:${c.name}`))
        .map((c) => c.name),
    );
    const newRuleNames = new Set(
      (unitJson.components.rules ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`rule:${c.name}`))
        .map((c) => c.name),
    );
    const newResourceNames = new Set(
      (unitJson.components.resources ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`resource:${c.name}`))
        .map((c) => c.name),
    );
    const newScriptNames = new Set((unitJson.components.scripts ?? []).map((c) => c.name));
    for (const comp of entry.components.skills) {
      if (!newSkillNames.has(comp.name))
        this.deleteFile((0, import_path2.join)(this.cwd, comp.path));
    }
    for (const comp of entry.components.rules) {
      if (!newRuleNames.has(comp.name))
        this.deleteFile((0, import_path2.join)(this.cwd, comp.path));
    }
    for (const comp of entry.components.resources) {
      if (!newResourceNames.has(comp.name))
        this.deleteFile((0, import_path2.join)(this.cwd, comp.path));
    }
    for (const comp of entry.components.scripts) {
      if (!newScriptNames.has(comp.name)) {
        removePreCommitHook(this.cwd, `aisk-${unitName}-${comp.name}`);
        this.deleteFile((0, import_path2.join)(this.cwd, comp.path));
      }
    }
  }
  // ─── File system utilities ─────────────────────────────────────────────────
  /** Delete a generated file and prune its immediate directory when it becomes empty. */
  deleteFile(fullPath) {
    if ((0, import_fs2.existsSync)(fullPath)) {
      (0, import_fs2.rmSync)(fullPath);
      this.tryRemoveEmptyDir(fullPath);
    }
  }
  /** Best-effort cleanup for component wrapper directories after their file is removed. */
  tryRemoveEmptyDir(fullPath) {
    const parentDir = (0, import_path2.dirname)(fullPath);
    try {
      if ((0, import_fs2.readdirSync)(parentDir).length === 0) (0, import_fs2.rmdirSync)(parentDir);
    } catch {}
  }
  /** Scan a file for AISK:CUSTOM blocks and return the aggregate customStatus. */
  scanCustomStatus(filePath) {
    if (!(0, import_fs2.existsSync)(filePath)) return void 0;
    const blocks = parseCustomBlocks((0, import_fs2.readFileSync)(filePath, "utf8"));
    if (blocks.length === 0) return void 0;
    return blocks.some((b) => b.status === "todo") ? "todo" : "done";
  }
  /** Ensure generated installer output stays out of the host project's git history. */
  ensureGitignores() {
    const entries = [
      { dir: (0, import_path2.join)(this.cwd, ".aisk"), content: "*\n" },
      {
        dir: (0, import_path2.join)(this.cwd, ".claude"),
        content: "skills/aisk-*/\nrules/aisk-*/\n",
      },
    ];
    for (const { dir, content } of entries) {
      (0, import_fs2.mkdirSync)(dir, { recursive: true });
      const gitignorePath = (0, import_path2.join)(dir, ".gitignore");
      if (!(0, import_fs2.existsSync)(gitignorePath))
        (0, import_fs2.writeFileSync)(gitignorePath, content);
    }
  }
  // ─── Data access ───────────────────────────────────────────────────────────
  /** Persist the latest component paths and customStatus for a unit. */
  updateInstalled(unitName, components) {
    const installedPath = (0, import_path2.join)(this.cwd, ".aisk", "installed.json");
    (0, import_fs2.mkdirSync)((0, import_path2.join)(this.cwd, ".aisk"), { recursive: true });
    const data = this.readInstalled();
    data.units[unitName] = { installedAt: /* @__PURE__ */ new Date().toISOString(), components };
    (0, import_fs2.writeFileSync)(installedPath, JSON.stringify(data, null, 2) + "\n");
  }
  /** Read one published unit definition from ~/.aisk/units. */
  readUnitJson(unitName) {
    const path = (0, import_path2.join)(this.aiskHome, "units", unitName, "unit.json");
    if (!(0, import_fs2.existsSync)(path)) return null;
    return JSON.parse((0, import_fs2.readFileSync)(path, "utf8"));
  }
  /** List published units in registry order with their current project install state. */
  getUnitList() {
    const unitsDir = (0, import_path2.join)(this.aiskHome, "units");
    if (!(0, import_fs2.existsSync)(unitsDir)) return [];
    const installed = this.readInstalled();
    const globalOrder = this.readGlobalOrder();
    const names =
      globalOrder.length > 0
        ? globalOrder.filter((n) =>
            (0, import_fs2.existsSync)((0, import_path2.join)(unitsDir, n, "unit.json")),
          )
        : (0, import_fs2.readdirSync)(unitsDir)
            .filter((n) =>
              (0, import_fs2.existsSync)((0, import_path2.join)(unitsDir, n, "unit.json")),
            )
            .sort();
    return names
      .map((dir) => {
        const unitJson = this.readUnitJson(dir);
        if (!unitJson) return null;
        return {
          name: dir,
          description: unitJson.description ?? "",
          installed: dir in installed.units,
        };
      })
      .filter((u) => u !== null);
  }
  /** Read the registry order produced by build.ts and published to ~/.aisk/units.json. */
  readGlobalOrder() {
    const orderPath = (0, import_path2.join)(this.aiskHome, "units.json");
    if (!(0, import_fs2.existsSync)(orderPath)) return [];
    return JSON.parse((0, import_fs2.readFileSync)(orderPath, "utf8"));
  }
  /** Sort names by registry order, falling back to lexical order for unknown names. */
  sortByGlobalOrder(names, order) {
    const ord = order ?? this.readGlobalOrder();
    const index = new Map(ord.map((n, i) => [n, i]));
    return [...names].sort((a, b) => {
      const ai = index.get(a) ?? Infinity;
      const bi = index.get(b) ?? Infinity;
      return ai !== bi ? ai - bi : a.localeCompare(b);
    });
  }
  // ─── Human-readable output ─────────────────────────────────────────────────
  printListHuman({ units }) {
    const installedCount = units.filter((u) => u.installed).length;
    process.stdout.write(
      `${units.length} unit${units.length !== 1 ? "s" : ""} available, ${installedCount} installed
`,
    );
    if (units.length === 0) return;
    process.stdout.write("\n");
    const maxLen = Math.max(...units.map((u) => u.name.length));
    for (const u of units) {
      const mark = u.installed ? "\u2713" : "\xB7";
      const todo = u.hasTodo ? "  [!]" : "";
      process.stdout.write(`  ${mark} ${u.name.padEnd(maxLen + 2)}${u.description}${todo}
`);
    }
  }
  printAddHuman({ added, updated, failed }) {
    const regular = added.filter((a) => !a.autoDep);
    const auto = added.filter((a) => a.autoDep);
    if (regular.length > 0) {
      process.stdout.write(`Added: ${regular.map((a) => a.name).join(", ")}
`);
    }
    if (auto.length > 0) {
      process.stdout.write(`  auto: ${auto.map((a) => a.name).join(", ")}
`);
    }
    if (updated.length > 0) {
      process.stdout.write(`Updated: ${updated.map((u) => u.name).join(", ")}
`);
    }
    for (const f of failed) {
      process.stdout.write(`Failed: ${f.name} \u2014 ${f.reason}
`);
    }
    if (added.length === 0 && updated.length === 0 && failed.length === 0) {
      process.stdout.write("Nothing to do.\n");
    }
  }
  printRemoveHuman({ removed, failed }) {
    if (removed.length > 0) {
      process.stdout.write(`Removed: ${removed.map((r) => r.name).join(", ")}
`);
    }
    for (const f of failed) {
      process.stdout.write(`Failed: ${f.name} \u2014 ${f.reason}
`);
    }
    if (removed.length === 0 && failed.length === 0) {
      process.stdout.write("Nothing to remove.\n");
    }
  }
  printUpdateHuman({ updated, failed }) {
    if (updated.length > 0) {
      process.stdout.write(`Updated: ${updated.map((u) => u.name).join(", ")}
`);
    }
    for (const f of failed) {
      process.stdout.write(`Failed: ${f.name} \u2014 ${f.reason}
`);
    }
    if (updated.length === 0 && failed.length === 0) {
      process.stdout.write("Nothing to update.\n");
    }
  }
  printRefreshHuman({ todo }) {
    if (todo.length === 0) {
      process.stdout.write("All custom blocks up to date.\n");
      return;
    }
    const totalFiles = todo.reduce((n, u) => n + u.files.length, 0);
    process.stdout.write(
      `${totalFiles} file${totalFiles !== 1 ? "s" : ""} with pending todos in ${todo.length} unit${todo.length !== 1 ? "s" : ""}:
`,
    );
    for (const { unit, files } of todo) {
      for (const f of files) {
        process.stdout.write(`  ${unit}: ${f}
`);
      }
    }
  }
  printShowHuman(result) {
    process.stdout.write(`${result.name} \u2014 ${result.description}
`);
    if (result.dependencies.length > 0) {
      process.stdout.write(`Dependencies: ${result.dependencies.join(", ")}
`);
    }
    process.stdout.write(`Status: ${result.installed ? "installed" : "not installed"}

`);
    process.stdout.write("Components:\n");
    for (const c of result.components) {
      const mark = !c.installed ? "\xB7" : c.customStatus === "todo" ? "!" : "\u2713";
      const typePad = c.type.padEnd(8);
      const todo = c.customStatus === "todo" ? "  [todo]" : "";
      const notInstalled = !c.installed && c.optional ? "  (optional, not installed)" : "";
      process.stdout.write(`  ${mark} ${typePad} ${c.name}${todo}${notInstalled}
`);
    }
  }
  printResolveHuman(result) {
    const autoSet = new Set(result.auto);
    if (result.to_install.length > 0) {
      const regular = result.to_install.filter((n) => !autoSet.has(n));
      const auto = result.to_install.filter((n) => autoSet.has(n));
      if (regular.length > 0) {
        process.stdout.write(`Install (${regular.length}): ${regular.join(", ")}
`);
      }
      if (auto.length > 0) {
        process.stdout.write(`  auto (${auto.length}): ${auto.join(", ")}
`);
      }
    }
    if (result.to_update.length > 0) {
      process.stdout.write(`Update (${result.to_update.length}): ${result.to_update.join(", ")}
`);
    }
    if (result.to_remove.length > 0) {
      process.stdout.write(`Remove (${result.to_remove.length}): ${result.to_remove.join(", ")}
`);
    }
    if (
      result.to_install.length === 0 &&
      result.to_update.length === 0 &&
      result.to_remove.length === 0
    ) {
      process.stdout.write("Nothing to change.\n");
    }
  }
};
if (null === module) {
  const cli2 = cac("installer");
  cli2.option("--human", "Output in human-readable text format instead of JSON");
  cli2
    .command("list", "List all available units with install and customization status")
    .action((options) => new Installer(void 0, void 0, options.human).list());
  cli2
    .command("add [...units]", 'Install units; use "all" to install all available units')
    .action((units, options) => new Installer(void 0, void 0, options.human).add(units ?? []));
  cli2
    .command("remove [...units]", 'Uninstall units; use "all" to remove all installed units')
    .action((units, options) => new Installer(void 0, void 0, options.human).remove(units ?? []));
  cli2
    .command("update [...units]", 'Update installed units; use "all" to update all')
    .action((units, options) => new Installer(void 0, void 0, options.human).update(units ?? []));
  cli2
    .command("refresh", "Sync customStatus from disk, output TODO list, clean orphaned hooks")
    .option("--silent", "Suppress output (used for internal pre-operation refresh)")
    .action((options) =>
      new Installer(void 0, void 0, options.human).refresh(options.silent ?? false),
    );
  cli2
    .command("show <unit>", "Show unit details and component status")
    .action((unit, options) => new Installer(void 0, void 0, options.human).show(unit));
  cli2
    .command(
      "resolve [...units]",
      "Resolve transitive deps and output changeset; no args means uninstall all",
    )
    .action((units, options) => new Installer(void 0, void 0, options.human).resolve(units ?? []));
  cli2.help();
  cli2.parse();
}

// bin/cli.ts
var pkgRoot = (0, import_path3.resolve)(__dirname, "..");
function installer() {
  return new Installer(process.cwd(), pkgRoot, true);
}
var cli = cac("ai-skills");
cli
  .command("install [...units]", "Install units into the current project")
  .example("  ai-skills install quick-ship")
  .example("  ai-skills install quick-ship staged-plan")
  .example("  ai-skills install all")
  .action((units) => installer().add(units));
cli
  .command("remove [...units]", "Remove installed units from the current project")
  .example("  ai-skills remove quick-ship")
  .action((units) => installer().remove(units));
cli
  .command("update [...units]", "Update installed units (all if none specified)")
  .example("  ai-skills update")
  .example("  ai-skills update quick-ship")
  .action((units) => installer().update(units.length ? units : ["all"]));
cli
  .command("list", "List available units and their install status")
  .action(() => installer().list());
cli
  .command("show <unit>", "Show details for a unit")
  .example("  ai-skills show staged-plan")
  .action((unit) => installer().show(unit));
cli.help();
cli.parse();
