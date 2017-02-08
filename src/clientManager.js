"use strict";

var _ = require("lodash");
var colors = require("colors/safe");
var fs = require("fs");
var Client = require("./client");
var Helper = require("./helper");
var Oidentd = require("./oidentd");

class ClientManager {
	constructor() {
		this.clients = [];
		if (typeof Helper.config.oidentd === "string") {
			this.identHandler = new Oidentd(Helper.config.oidentd);
		}
	}

	findClient(name, token) {
		for (var i in this.clients) {
			var client = this.clients[i];
			if (client.name === name || (token && token === client.config.token)) {
				return client;
			}
		}
		return false;
	}

	autoloadUsers() {
		this.getUsers().forEach(name => this.loadUser(name));

		fs.watch(Helper.USERS_PATH, _.debounce(() => {
			const loaded = this.clients.map(c => c.name);
			const updatedUsers = this.getUsers();

			// New users created since last time users were loaded
			_.difference(updatedUsers, loaded).forEach(name => this.loadUser(name));

			// Existing users removed since last time users were loaded
			_.difference(loaded, updatedUsers).forEach(name => {
				const client = _.find(this.clients, {name: name});
				if (client) {
					client.quit();
					this.clients = _.without(this.clients, client);
					log.info(`User ${colors.bold(name)} disconnected and removed`);
				}
			});
		}, 1000, {maxWait: 10000}));
	}

	loadUser(name) {
		let json;
		try {
			json = this.readUserConfig(name);
		} catch (e) {
			log.error("Failed to read user config", e);
			return;
		}
		if (!this.findClient(name)) {
			this.clients.push(new Client(
				this,
				name,
				json
				));
		}
	}

	getUsers() {
		var users = [];
		try {
			var files = fs.readdirSync(Helper.USERS_PATH);
			files.forEach(file => {
				if (file.indexOf(".json") !== -1) {
					users.push(file.replace(".json", ""));
				}
			});
		} catch (e) {
			log.error("Failed to get users", e);
			return;
		}
		return users;
	}

	addUser(name, password) {
		var users = this.getUsers();
		if (users.indexOf(name) !== -1) {
			return false;
		}
		try {

			if (require("path").basename(name) !== name) {
				throw new Error(name + " is an invalid username.");
			}

			var user = {
				user: name,
				password: password || "",
				log: false,
				networks: []
			};
			fs.writeFileSync(
				Helper.getUserConfigPath(name),
				JSON.stringify(user, null, "\t")
				);
		} catch (e) {
			log.error("Failed to add user " + name, e);
			throw e;
		}
		return true;
	}

	updateUser(name, opts, callback) {
		const users = this.getUsers();
		if (users.indexOf(name) === -1) {
			return false;
		}
		if (typeof opts === "undefined") {
			return false;
		}

		let user = this.readUserConfig(name);
		const currentUser = JSON.stringify(user, null, "\t");
		_.assign(user, opts);
		const newUser = JSON.stringify(user, null, "\t");

		// Do not touch the disk if object has not changed
		if (currentUser === newUser) {
			return callback ? callback() : true;
		}

		fs.writeFile(Helper.getUserConfigPath(name), newUser, (err) => {
			if (err) {
				log.error("Failed to update user", err);
			}

			if (callback) {
				callback(err);
			}
		});
	}

	readUserConfig(name) {
		var users = this.getUsers();
		if (users.indexOf(name) === -1) {
			return false;
		}
		var data = fs.readFileSync(Helper.getUserConfigPath(name), "utf-8");
		return JSON.parse(data);
	}

	removeUser(name) {
		var users = this.getUsers();
		if (users.indexOf(name) === -1) {
			return false;
		}
		try {
			fs.unlinkSync(Helper.getUserConfigPath(name));
		} catch (e) {
			throw e;
		}
		return true;
	}
}
module.exports = ClientManager;
