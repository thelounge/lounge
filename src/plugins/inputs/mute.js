"use strict";
const Msg = require("../../models/msg");

exports.commands = ["mute", "unmute"];

exports.input = function (network, chan, cmd, args) {
	const valueToSet = cmd === "mute" ? true : false;

	if (args.length === 0) {
		chan.setMuteStatus(valueToSet);
	} else if (args.length > 1) {
		for (const arg of args) {
			const target = network.channels.find((c) => c.name === args[0]);

			if (target) {
				target.setMuteStatus(valueToSet);
			} else {
				chan.pushMessage(
					this,
					new Msg({
						type: Msg.Type.ERROR,
						text: `No open conversation named ${arg} was found.`,
					})
				);

				return;
			}
		}
	}

	return true;
};
