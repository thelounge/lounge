"use strict";

const _ = require("lodash");
const Helper = require("../../helper");
const Msg = require("../../models/msg");
const User = require("../../models/user");
const pkg = require("../../../package.json");

const ctcpResponses = {
	CLIENTINFO: () =>
		Object.getOwnPropertyNames(ctcpResponses)
			.filter((key) => key !== "CLIENTINFO" && typeof ctcpResponses[key] === "function")
			.join(" "),
	PING: ({message}) => message.substring(5),
	SOURCE: () => pkg.repository.url,
	VERSION: () => pkg.name + " " + Helper.getVersion() + " -- " + pkg.homepage,
};

module.exports = function (irc, network) {
	const client = this;
	const lobby = network.channels[0];

	const ctcpResponseActions = {
		PING: pingResponse,
	};

	function pingResponse({message, nick, target, time}, chan) {
		const match = message.substring(5).match(/\d+/);

		if (
			!match ||
			(client.expectedPings.includes(nick) && match[0] !== client.expectedPings[nick]) ||
			nick === irc.user.nick ||
			target !== irc.user.nick
		) {
			return;
		}

		delete client.expectedPings[nick];

		const text = `PING ${(Date.now() - parseInt(match)) / 1000}s`;

		const msg = new Msg({
			type: Msg.Type.CTCP,
			time: time,
			from: chan.getUser(nick),
			ctcpMessage: text,
		});
		chan.pushMessage(client, msg, true);
		return true;
	}

	irc.on("ctcp response", function (data) {
		const shouldIgnore = network.ignoreList.some(function (entry) {
			return Helper.compareHostmask(entry, data);
		});

		if (shouldIgnore) {
			return;
		}

		let chan = network.getChannel(data.nick);

		if (typeof chan === "undefined") {
			chan = lobby;
		}

		const action = ctcpResponseActions[data.type];
		const prventFurtherAction = action ? action(data, chan) : null;

		if (prventFurtherAction) {
			return;
		}

		const msg = new Msg({
			type: Msg.Type.CTCP,
			time: data.time,
			from: chan.getUser(data.nick),
			ctcpMessage: data.message,
		});
		chan.pushMessage(client, msg, true);
	});

	// Limit requests to a rate of one per second max
	irc.on(
		"ctcp request",
		_.throttle(
			(data) => {
				// Ignore echoed ctcp requests that aren't targeted at us
				// See https://github.com/kiwiirc/irc-framework/issues/225
				if (
					data.nick === irc.user.nick &&
					data.nick !== data.target &&
					network.irc.network.cap.isEnabled("echo-message")
				) {
					return;
				}

				const shouldIgnore = network.ignoreList.some(function (entry) {
					return Helper.compareHostmask(entry, data);
				});

				if (shouldIgnore) {
					return;
				}

				const target = data.from_server ? data.hostname : data.nick;
				const response = ctcpResponses[data.type];

				if (response) {
					irc.ctcpResponse(target, data.type, response(data));
				}

				// Let user know someone is making a CTCP request against their nick
				const msg = new Msg({
					type: Msg.Type.CTCP_REQUEST,
					time: data.time,
					from: new User({nick: target}),
					hostmask: data.ident + "@" + data.hostname,
					ctcpMessage: data.message,
				});
				lobby.pushMessage(client, msg, true);
			},
			1000,
			{trailing: false}
		)
	);
};
