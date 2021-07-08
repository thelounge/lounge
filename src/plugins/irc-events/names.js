"use strict";

module.exports = function (irc, network) {
	const client = this;

	irc.on("userlist", function (data) {
		const chan = network.getChannel(data.channel);

		if (typeof chan === "undefined") {
			return;
		}

		const newUsers = new Map();

		data.users.forEach((user) => {
			const newUser = chan.getUser(user.nick);
			newUser.setModes(user.modes, network.serverOptions.PREFIX);

			newUsers.set(user.nick.toLowerCase(), newUser);
		});

		chan.users = newUsers;

		client.emit("users", {
			chan: chan.id,
		});
	});
};
