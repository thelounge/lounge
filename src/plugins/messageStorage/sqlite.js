"use strict";

const log = require("../../log");
const path = require("path");
const fs = require("fs");
const Helper = require("../../helper");
const Msg = require("../../models/msg");

let BetterSqlite3;

try {
	BetterSqlite3 = require("better-sqlite3");
} catch (e) {
	log.error("Unable to load better-sqlite3 module.");
}

const currentSchemaVersion = 1520239200;

const schema = [
	// Schema version #1
	"CREATE TABLE IF NOT EXISTS options (name TEXT, value TEXT, CONSTRAINT name_unique UNIQUE (name))",
	"CREATE TABLE IF NOT EXISTS messages (network TEXT, channel TEXT, time INTEGER, type TEXT, msg TEXT)",
	"CREATE INDEX IF NOT EXISTS network_channel ON messages (network, channel)",
	"CREATE INDEX IF NOT EXISTS time ON messages (time)",
];

class MessageStorage {
	constructor(client) {
		this.client = client;
		this.isEnabled = false;
	}

	enable() {
		if (!BetterSqlite3) {
			return false;
		}

		const logsPath = Helper.getUserLogsPath();

		try {
			fs.mkdirSync(logsPath, {recursive: true});
		} catch (e) {
			log.error("Unable to create logs directory", e);

			return false;
		}

		const sqlitePath = path.join(logsPath, `${this.client.name}.sqlite3`);
		this.database = new BetterSqlite3(sqlitePath);

		try {
			this.database.transaction((queries) => {
				for (const query of queries) {
					this.database.prepare(query).run();
				}
			})(schema);

			const check = this.database
				.prepare("SELECT value FROM options WHERE name = 'schema_version'")
				.get();

			const storedSchemaVersion = check ? parseInt(check.value, 10) : null;
			let stmt;

			if (storedSchemaVersion === null) {
				stmt = this.database.prepare(
					"INSERT INTO options (name, value) VALUES ('schema_version', ?)"
				);
			} else if (storedSchemaVersion > currentSchemaVersion) {
				log.error(
					`sqlite schema version is higher than expected (${storedSchemaVersion} > ${currentSchemaVersion}). Is The Lounge out of date?`
				);
				return false;
			} else if (storedSchemaVersion < currentSchemaVersion) {
				log.info(
					`sqlite schema version is out of date (${storedSchemaVersion} < ${currentSchemaVersion}). Running migrations if any.`
				);

				stmt = this.database.prepare(
					"UPDATE options SET value = ? WHERE name = 'schema_version'"
				);
			}

			if (stmt) {
				this.database.transaction(() => {
					stmt.run(currentSchemaVersion.toString());
				})();
			}
		} catch (error) {
			log.error(`Failed to initialize sqltie database: ${error}`);
			return false;
		}

		this.isEnabled = true;
		return true;
	}

	close(callback) {
		if (!this.isEnabled) {
			return;
		}

		try {
			this.database.close();
		} catch (error) {
			log.error(`Failed to close sqlite database: ${error}`);
		}

		this.isEnabled = false;
		callback();
	}

	index(network, channel, msg) {
		if (!this.isEnabled) {
			return;
		}

		const clonedMsg = Object.keys(msg).reduce((newMsg, prop) => {
			// id is regenerated when messages are retrieved
			// previews are not stored because storage is cleared on lounge restart
			// type and time are stored in a separate column
			if (prop !== "id" && prop !== "previews" && prop !== "type" && prop !== "time") {
				newMsg[prop] = msg[prop];
			}

			return newMsg;
		}, {});

		const index = this.database.prepare(
			"INSERT INTO messages(network, channel, time, type, msg) VALUES(?, ?, ?, ?, ?)"
		);

		this.database.transaction(() => {
			index.run(
				network.uuid,
				channel.name.toLowerCase(),
				msg.time.getTime(),
				msg.type,
				JSON.stringify(clonedMsg)
			);
		})();
	}

	deleteChannel(network, channel) {
		if (!this.isEnabled) {
			return;
		}

		const deleteStmt = this.database.prepare(
			"DELETE FROM messages WHERE network = ? AND channel = ?"
		);
		this.database.transaction(() => {
			deleteStmt.run(network.uuid, channel.name.toLowerCase());
		})();
	}

	/**
	 * Load messages for given channel on a given network and resolve a promise with loaded messages.
	 *
	 * @param Network network - Network object where the channel is
	 * @param Chan channel - Channel object for which to load messages for
	 */
	getMessages(network, channel) {
		if (!this.isEnabled || Helper.config.maxHistory === 0) {
			return Promise.resolve([]);
		}

		// If unlimited history is specified, load 100k messages
		const limit = Helper.config.maxHistory < 0 ? 100000 : Helper.config.maxHistory;

		return new Promise((resolve, reject) => {
			const selectStmt = this.database.prepare(
				"SELECT * FROM messages WHERE network = ? AND channel = ? ORDER BY time ASC LIMIT ?"
			);

			try {
				return resolve(
					selectStmt
						.all(network.uuid, channel.name.toLowerCase(), limit)
						.map(this._messageParser(true))
				);
			} catch (error) {
				return reject(error);
			}
		});
	}

	search(query) {
		if (!this.isEnabled) {
			return Promise.resolve([]);
		}

		let select =
			"SELECT * FROM messages WHERE type = 'message' AND json_extract(msg, '$.text') LIKE ?";
		const params = [`%${query.searchTerm}%`];

		if (query.networkUuid) {
			select += " AND network = ? ";
			params.push(query.networkUuid);
		}

		if (query.channelName) {
			select += " AND channel = ? ";
			params.push(query.channelName.toLowerCase());
		}

		select += " ORDER BY time ASC LIMIT ? OFFSET ? ";
		params.push(100);

		query.offset = parseInt(query.offset, 10) || 0;
		params.push(query.offset);

		return new Promise((resolve, reject) => {
			try {
				resolve({
					searchTerm: query.searchTerm,
					target: query.channelName,
					networkUuid: query.networkUuid,
					offset: query.offset,
					results: this.database
						.prepare(select)
						.all(params)
						.map(this._messageParser(false, query.offset)),
				});
			} catch (error) {
				return reject(error);
			}
		});
	}

	_messageParser(useClientId, start) {
		return (row) => {
			const msg = JSON.parse(row.msg);
			msg.time = row.time;
			msg.type = row.type;
			msg.networkUuid = row.network;
			msg.channelName = row.channel;

			if (useClientId) {
				msg.id = this.client.idMsg++;
			} else {
				msg.id = start++;
			}

			return new Msg(msg);
		};
	}
}

module.exports = MessageStorage;
