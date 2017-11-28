"use strict";

const Msg = require("../../models/msg");

module.exports = function(irc, network) {
	const client = this;

	irc.on("quit", function(data) {
		network.channels.forEach((chan) => {
			const user = chan.findUser(data.nick);

			if (typeof user === "undefined") {
				return;
			}

			const msg = new Msg({
				time: data.time,
				type: Msg.Type.QUIT,
				text: data.message || "",
				hostmask: data.ident + "@" + data.hostname,
				from: user.value(),
			});
			chan.pushMessage(client, msg);

			chan.removeUser(user);
			client.emit("users", {
				chan: chan.id,
			});
		});
	});
};
