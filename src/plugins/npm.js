"use strict";
const Helper = require("../helper");
const colors = require("colors/safe");
const log = require("../log.js");
const fs = require("fs-extra");
const path = require("path");
const child = require("child_process");
const packagesPath = Helper.getPackagesPath();
const packagesParent = path.dirname(packagesPath);
const packagesConfig = path.join(packagesParent, "package.json");

const packageDirJson = {
	private: true,
	description: "Packages for The Lounge. All packages in node_modules directory will be automatically loaded.",
};

module.exports = {
	ensurePackageJsonExists,
	runNpmCommand,
};

function runNpmCommand(command, {packageName = "", returnStdOut = false, resolveOnError = false, metadata = {}, args = []}) {
	log.debug(`${command}ing ${colors.green(packageName)}...`);
	return new Promise((res, rej) => {
		let output = "";
		const npm = child.spawn(
			process.platform === "win32" ? "npm.cmd" : "npm",
			[
				command,
				...args,
				"--no-package-lock",
				"--no-progress",
				"--prefix",
				packagesParent,
				packageName,
			],
			{
				// Always accept stdin, and ignore stderr, either receive stdout (if we want to return it) or ignore
				stdio: [process.stdin, returnStdOut ? "pipe" : "ignore", "ignore"],
			}
		);

		if (returnStdOut) {
			npm.stdout.on("data", (data) => {
				output += data;
			});
		}

		npm.on("error", rej);

		npm.on("close", (code) => {
			if (code !== 0 && !resolveOnError) {
				return rej(`Failed to ${command} ${colors.green(`${packageName} " v" + ${metadata.version}`)}. Exit code: ${code}`);
			}
			res(output);
		});
	});
}

function ensurePackageJsonExists() {
	return fs.ensureDir(packagesPath) // Create node_modules folder, otherwise npm will start walking upwards to find one
		.then(() => fs.writeJson(packagesConfig, packageDirJson, {spaces: "\t"})); // Create package.json to avoid npm warnings
}
