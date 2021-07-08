"use strict";

const _ = require("lodash");
const Msg = require("../../models/msg");

module.exports = function (irc, network) {
	const client = this;

	// The following saves the channel key based on channel mode instead of
	// extracting it from `/join #channel key`. This lets us not have to
	// temporarily store the key until successful join, but also saves the key
	// if a key is set or changed while being on the channel.
	irc.on("channel info", function (data) {
		if (!data.modes) {
			return;
		}

		const targetChan = network.getChannel(data.channel);

		if (typeof targetChan === "undefined") {
			return;
		}

		data.modes.forEach((mode) => {
			const text = mode.mode;
			const add = text[0] === "+";
			const char = text[1];

			if (char === "k") {
				targetChan.key = add ? mode.param : "";
				client.save();
			}
		});

		const msg = new Msg({
			type: Msg.Type.MODE_CHANNEL,
			text: `${data.raw_modes} ${data.raw_params.join(" ")}`,
		});
		targetChan.pushMessage(client, msg);
	});

	irc.on("mode", function (data) {
		let targetChan;

		if (data.target === irc.user.nick) {
			targetChan = network.channels[0];
		} else {
			targetChan = network.getChannel(data.target);

			if (typeof targetChan === "undefined") {
				return;
			}
		}

		const msg = new Msg({
			time: data.time,
			type: Msg.Type.MODE,
			from: targetChan.getUser(data.nick),
			text: `${data.raw_modes} ${data.raw_params.join(" ")}`,
			self: data.nick === irc.user.nick,
		});

		const users = [];

		for (const param of data.raw_params) {
			if (targetChan.findUser(param)) {
				users.push(param);
			}
		}

		if (users.length > 0) {
			msg.users = users;
		}

		targetChan.pushMessage(client, msg);

		let usersUpdated;
		const userModeSortPriority = {};
		const supportsMultiPrefix = network.irc.network.cap.isEnabled("multi-prefix");

		irc.network.options.PREFIX.forEach((prefix, index) => {
			userModeSortPriority[prefix.symbol] = index;
		});

		data.modes.forEach((mode) => {
			const add = mode.mode[0] === "+";
			const char = mode.mode[1];

			if (char === "k") {
				targetChan.key = add ? mode.param : "";
				client.save();
			}

			if (!mode.param) {
				return;
			}

			const user = targetChan.findUser(mode.param);

			if (!user) {
				return;
			}

			usersUpdated = true;

			if (!supportsMultiPrefix) {
				return;
			}

			const changedMode = network.serverOptions.PREFIX.modeToSymbol[char];

			if (!add) {
				_.pull(user.modes, changedMode);
			} else if (!user.modes.includes(changedMode)) {
				user.modes.push(changedMode);
				user.modes.sort(function (a, b) {
					return userModeSortPriority[a] - userModeSortPriority[b];
				});
			}
		});

		if (!usersUpdated) {
			return;
		}

		if (!supportsMultiPrefix) {
			// TODO: This is horrible
			irc.raw("NAMES", data.target);
		} else {
			client.emit("users", {
				chan: targetChan.id,
			});
		}
	});
};
