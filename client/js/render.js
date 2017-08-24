"use strict";

const $ = require("jquery");
const templates = require("../views");
const options = require("./options");
const renderPreview = require("./renderPreview");
const utils = require("./utils");
const sorting = require("./sorting");
const constants = require("./constants");
const condensed = require("./condensed");

const chat = $("#chat");
const sidebar = $("#sidebar");

module.exports = {
	appendMessage,
	buildChannelMessages,
	buildChatMessage,
	renderChannel,
	renderChannelMessages,
	renderChannelUsers,
	renderNetworks,
};

function buildChannelMessages(data) {
	return data.messages.reduce(function(docFragment, message) {
		appendMessage(
			docFragment,
			data.id,
			data.type,
			message.type,
			buildChatMessage({
				chan: data.id,
				msg: message
			}),
			docFragment.children("div.msg").last()
		);
		return docFragment;
	}, $(document.createDocumentFragment()));
}

function appendMessage(container, chan, chanType, messageType, msg, lastChild) {
	// TODO: To fix #1432, statusMessage option should entirely be implemented in CSS
	if (constants.condensedTypes.indexOf(messageType) === -1 || chanType !== "channel" || options.statusMessages !== "condensed") {
		container.append(msg);
		return;
	}

	if (lastChild && $(lastChild).hasClass("condensed")) {
		lastChild.append(msg);
		condensed.updateText(lastChild, [messageType]);
	} else if (lastChild && $(lastChild).is(constants.condensedTypesQuery)) {
		const newCondensed = buildChatMessage({
			chan: chan,
			msg: {
				type: "condensed",
				time: msg.attr("data-time"),
				previews: []
			}
		});

		condensed.updateText(newCondensed, [messageType, lastChild.attr("data-type")]);
		container.append(newCondensed);
		newCondensed.append(lastChild);
		newCondensed.append(msg);
	} else {
		container.append(msg);
	}
}

function buildChatMessage(data) {
	const type = data.msg.type;
	let target = "#chan-" + data.chan;
	if (type === "error") {
		target = "#chan-" + chat.find(".active").data("id");
	}

	const chan = chat.find(target);
	let template = "msg";

	// See if any of the custom highlight regexes match
	if (!data.msg.highlight && !data.msg.self
		&& options.highlightsRE
		&& (type === "message" || type === "notice")
		&& options.highlightsRE.exec(data.msg.text)) {
		data.msg.highlight = true;
	}

	if (constants.actionTypes.indexOf(type) !== -1) {
		data.msg.template = "actions/" + type;
		template = "msg_action";
	} else if (type === "unhandled") {
		template = "msg_unhandled";
	} else if (type === "condensed") {
		template = "msg_condensed";
	}

	const msg = $(templates[template](data.msg));
	const content = msg.find(".content");

	if (template === "msg_action") {
		content.html(templates.actions[type](data.msg));
	}

	data.msg.previews.forEach((preview) => {
		renderPreview(preview, msg);
	});

	if ((type === "message" || type === "action" || type === "notice") && chan.hasClass("channel")) {
		const nicks = chan.find(".users").data("nicks");
		if (nicks) {
			const find = nicks.indexOf(data.msg.from);
			if (find !== -1) {
				nicks.splice(find, 1);
				nicks.unshift(data.msg.from);
			}
		}
	}

	return msg;
}

function renderChannel(data) {
	renderChannelMessages(data);

	if (data.type === "channel") {
		renderChannelUsers(data);
	}
}

function renderChannelMessages(data) {
	const documentFragment = buildChannelMessages(data);
	const channel = chat.find("#chan-" + data.id + " .messages").append(documentFragment);

	if (data.firstUnread > 0) {
		const first = channel.find("#msg-" + data.firstUnread);

		// TODO: If the message is far off in the history, we still need to append the marker into DOM
		if (!first.length) {
			channel.prepend(templates.unread_marker());
		} else if (first.parent().hasClass("condensed")) {
			first.parent().before(templates.unread_marker());
		} else {
			first.before(templates.unread_marker());
		}
	} else {
		channel.append(templates.unread_marker());
	}

	if (data.type !== "lobby") {
		let lastDate;
		$(chat.find("#chan-" + data.id + " .messages .msg[data-time]")).each(function() {
			const msg = $(this);
			const msgDate = new Date(msg.attr("data-time"));

			// Top-most message in a channel
			if (!lastDate) {
				lastDate = msgDate;
				msg.before(templates.date_marker({msgDate: msgDate}));
			}

			if (lastDate.toDateString() !== msgDate.toDateString()) {
				var parent = msg.parent();
				if (parent.hasClass("condensed")) {
					msg.insertAfter(parent);
				}
				msg.before(templates.date_marker({msgDate: msgDate}));
			}

			lastDate = msgDate;
		});
	}
}

function renderChannelUsers(data) {
	const users = chat.find("#chan-" + data.id).find(".users");
	const nicks = data.users
		.concat() // Make a copy of the user list, sort is applied in-place
		.sort((a, b) => b.lastMessage - a.lastMessage)
		.map((a) => a.nick);

	const search = users
		.find(".search")
		.attr("placeholder", nicks.length + " " + (nicks.length === 1 ? "user" : "users"));

	users
		.data("nicks", nicks)
		.find(".names-original")
		.html(templates.user(data));

	// Refresh user search
	if (search.val().length) {
		search.trigger("input");
	}
}

function renderNetworks(data) {
	sidebar.find(".empty").hide();
	sidebar.find(".networks").append(
		templates.network({
			networks: data.networks
		})
	);

	const channels = $.map(data.networks, function(n) {
		return n.channels;
	});
	chat.append(
		templates.chat({
			channels: channels
		})
	);
	channels.forEach((channel) => {
		renderChannel(channel);

		if (channel.type === "channel") {
			chat.find("#chan-" + channel.id).data("needsNamesRefresh", true);
		}
	});

	utils.confirmExit();
	sorting();

	if (sidebar.find(".highlight").length) {
		utils.toggleNotificationMarkers(true);
	}
}
