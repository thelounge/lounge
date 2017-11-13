"use strict";

const pkg = require("../package.json");
var _ = require("lodash");
var path = require("path");
var os = require("os");
var fs = require("fs");
var net = require("net");
var bcrypt = require("bcryptjs");
const colors = require("colors/safe");

var Helper = {
	config: null,
	expandHome: expandHome,
	getPackagesPath: getPackagesPath,
	getPackageModulePath: getPackageModulePath,
	getStoragePath: getStoragePath,
	getUserConfigPath: getUserConfigPath,
	getLogsPath: getLogsPath,
	getUserLogsPath: getUserLogsPath,
	setHome: setHome,
	getVersion: getVersion,
	getGitCommit: getGitCommit,
	ip2hex: ip2hex,
	cleanIrcMessage: cleanIrcMessage,

	password: {
		hash: passwordHash,
		compare: passwordCompare,
		requiresUpdate: passwordRequiresUpdate,
	},
};

module.exports = Helper;

Helper.config = require(path.resolve(path.join(
	__dirname,
	"..",
	"defaults",
	"config.js"
)));

function getVersion() {
	const gitCommit = getGitCommit();
	return gitCommit ? `source (${gitCommit})` : `v${pkg.version}`;
}

let _gitCommit;
function getGitCommit() {
	if (_gitCommit !== undefined) {
		return _gitCommit;
	}
	try {
		_gitCommit = require("child_process")
			.execSync("git rev-parse --short HEAD 2> /dev/null") // Returns hash of current commit
			.toString()
			.trim();
		return _gitCommit;
	} catch (e) {
		// Not a git repository or git is not installed
		_gitCommit = null;
		return null;
	}
}

function setHome(homePath) {
	this.HOME = expandHome(homePath);
	this.CONFIG_PATH = path.join(this.HOME, "config.js");
	this.USERS_PATH = path.join(this.HOME, "users");

	// Reload config from new home location
	if (fs.existsSync(this.CONFIG_PATH)) {
		var userConfig = require(this.CONFIG_PATH);
		this.config = _.merge(this.config, userConfig);
	}

	if (!this.config.displayNetwork && !this.config.lockNetwork) {
		this.config.lockNetwork = true;

		log.warn(`${colors.bold("displayNetwork")} and ${colors.bold("lockNetwork")} are false, setting ${colors.bold("lockNetwork")} to true.`);
	}

	// TODO: Remove in future release
	if (this.config.debug === true) {
		log.warn("debug option is now an object, see defaults file for more information.");
		this.config.debug = {ircFramework: true};
	}

	// TODO: Remove in future release
	// Backwards compatibility for old way of specifying themes in settings
	if (this.config.theme.includes(".css")) {
		log.warn(`Referring to CSS files in the ${colors.green("theme")} setting of ${colors.green(Helper.CONFIG_PATH)} is ${colors.bold("deprecated")} and will be removed in a future version.`);
	} else {
		this.config.theme = `themes/${this.config.theme}.css`;
	}
}

function getUserConfigPath(name) {
	return path.join(this.USERS_PATH, name + ".json");
}

function getLogsPath() {
	return path.join(this.HOME, "logs");
}

function getUserLogsPath(name, network) {
	return path.join(this.HOME, "logs", name, network);
}

function getStoragePath() {
	return path.join(this.HOME, "storage");
}

function getPackagesPath() {
	return path.join(this.HOME, "packages", "node_modules");
}

function getPackageModulePath(packageName) {
	return path.join(Helper.getPackagesPath(), packageName);
}

function ip2hex(address) {
	// no ipv6 support
	if (!net.isIPv4(address)) {
		return "00000000";
	}

	return address.split(".").map(function(octet) {
		var hex = parseInt(octet, 10).toString(16);

		if (hex.length === 1) {
			hex = "0" + hex;
		}

		return hex;
	}).join("");
}

function expandHome(shortenedPath) {
	if (!shortenedPath) {
		return "";
	}

	const home = os.homedir().replace("$", "$$$$");
	return path.resolve(shortenedPath.replace(/^~($|\/|\\)/, home + "$1"));
}

function cleanIrcMessage(message) {
	// TODO: This does not strip hex based colours
	return message.replace(/\x02|\x1D|\x1F|\x16|\x0F|\x03(?:[0-9]{1,2}(?:,[0-9]{1,2})?)?/g, "");
}

function passwordRequiresUpdate(password) {
	return bcrypt.getRounds(password) !== 11;
}

function passwordHash(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(11));
}

function passwordCompare(password, expected) {
	return bcrypt.compare(password, expected);
}
