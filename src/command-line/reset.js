"use strict";

const colors = require("colors/safe");
const program = require("commander");
const fs = require("fs");
const Helper = require("../helper");
const Utils = require("./utils");

program
	.command("reset <name>")
	.description("Reset user password")
	.on("--help", Utils.extraHelp)
	.action(function(name) {
		if (!fs.existsSync(Helper.getUsersPath())) {
			log.error(`${Helper.getUsersPath({expanded: false})} does not exist.`);
			return;
		}

		const ClientManager = require("../clientManager");

		var users = new ClientManager().getUsers();

		if (users === undefined) { // There was an error, already logged
			return;
		}

		if (users.indexOf(name) === -1) {
			log.error(`User ${colors.bold(name)} does not exist.`);
			return;
		}
		var file = Helper.getUserConfigPath(name);
		var user = require(file);
		log.prompt({
			text: "Enter new password:",
			silent: true,
		}, function(err, password) {
			if (err) {
				return;
			}
			user.password = Helper.password.hash(password);
			user.sessions = {};
			fs.writeFileSync(
				file,
				JSON.stringify(user, null, "\t")
			);
			log.info(`Successfully reset password for ${colors.bold(name)}.`);
		});
	});
