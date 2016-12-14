"use strict";

const fs = require("fs");
const Helper = require("./helper");

class OidentdFile {
	constructor(file) {
		this.file = Helper.expandHome(file);
		this.connectionId = 0;
		this.connections = new Map();
		this.refresh();
	}

	addSocket(socket, user) {
		const id = this.connectionId++;

		this.connections.set(id, {socket: socket, user: user});
		this.refresh();

		return id;
	}

	removeSocket(id) {
		this.connections.delete(id);

		this.refresh();
	}

	refresh() {
		let file = "# Warning: file generated by The Lounge: changes will be overwritten!\n";

		this.connections.forEach((connection) => {
			file += "to " + connection.socket.remoteAddress
				+ " lport " + connection.socket.localPort
				+ " from " + connection.socket.localAddress
				+ " fport " + connection.socket.remotePort
				+ " { reply \"" + connection.user + "\" }\n";
		});

		fs.writeFile(this.file, file, {flag: "w+"}, function(err) {
			if (err) {
				log.error("Failed to update oidentd file!", err);
			}
		});
	}
}

module.exports = OidentdFile;
