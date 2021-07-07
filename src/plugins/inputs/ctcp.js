"use strict";

const Msg = require("../../models/msg");

exports.commands = ["ctcp", "ping"];

exports.input = function ({irc}, chan, cmd, args) {
	switch (cmd) {
		case "ctcp":
			if (args.length < 2) {
				chan.pushMessage(
					this,
					new Msg({
						type: Msg.Type.ERROR,
						text: "Usage: /ctcp <nick> <ctcp_type>",
					})
				);
				return;
			}

			chan.pushMessage(
				this,
				new Msg({
					type: Msg.Type.CTCP_REQUEST,
					ctcpMessage: `"${args.slice(1).join(" ")}" to ${args[0]}`,
					from: chan.getUser(irc.user.nick),
				})
			);
			break;

		case "ping":
			if (args.length !== 1) {
				chan.pushMessage(
					this,
					new Msg({
						type: Msg.Type.ERROR,
						text: "Usage: /ping <nick>",
					})
				);
				return;
			}

			this.expectedPings[args[0]] = Date.now().toString();
			args = args.concat(["PING", this.expectedPings[args[0]]]);
			break;
	}

	irc.ctcpRequest(...args);
};
