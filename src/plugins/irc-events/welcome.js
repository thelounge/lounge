"use strict";

const Msg = require("../../models/msg");

module.exports = function(irc, network) {
	const client = this;

	irc.on("registered", function(data) {
		network.setNick(data.nick);

		const [lobby] = network.channels;
		const msg = new Msg({
			text: "You're now known as " + data.nick,
		});
		lobby.pushMessage(client, msg);

		client.save();
		client.emit("nick", {
			network: network.id,
			nick: data.nick,
		});
	});
};
