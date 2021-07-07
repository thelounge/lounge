"use strict";

exports.commands = ["quit"];
exports.allowDisconnected = true;

exports.input = function (network, chan, cmd, args) {
	const client = this;

	client.emit("confirm-dialog", {
		title: "Remove network",
		text: `Are you sure you want to quit and remove <b>${network.name}</b>? This cannot be undone.`,
		button: "Remove network",
		emit: {
			target: "network:quit",
			data: {
				uuid: network.uuid,
				quiteMessage: args[0] ? args.join(" ") : null,
			},
		},
	});

	return true;
};
