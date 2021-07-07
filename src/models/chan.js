"use strict";

const _ = require("lodash");
const log = require("../log");
const Helper = require("../helper");
const User = require("./user");
const Msg = require("./msg");
const storage = require("../plugins/storage");

module.exports = Chan;

Chan.Type = {
	CHANNEL: "channel",
	LOBBY: "lobby",
	QUERY: "query",
	SPECIAL: "special",
};

Chan.SpecialType = {
	BANLIST: "list_bans",
	INVITELIST: "list_invites",
	CHANNELLIST: "list_channels",
	IGNORELIST: "list_ignored",
};

Chan.State = {
	PARTED: 0,
	JOINED: 1,
};

function Chan(attr) {
	_.defaults(this, attr, {
		id: 0,
		messages: [],
		name: "",
		key: "",
		topic: "",
		type: Chan.Type.CHANNEL,
		state: Chan.State.PARTED,
		firstUnread: 0,
		unread: 0,
		highlight: 0,
		users: new Map(),
		muted: attr.muted,
	});
}

Chan.prototype.destroy = function () {
	this.dereferencePreviews(this.messages);
};

Chan.prototype.pushMessage = function (client, msg, increasesUnread) {
	const chan = this.id;
	const obj = {chan, msg};

	msg.id = client.idMsg++;

	// If this channel is open in any of the clients, do not increase unread counter
	const isOpen = _.find(client.attachedClients, {openChannel: chan}) !== undefined;

	if (msg.self) {
		// reset counters/markers when receiving self-/echo-message
		this.unread = 0;
		this.firstUnread = msg.id;
		this.highlight = 0;
	} else if (!isOpen) {
		if (!this.firstUnread) {
			this.firstUnread = msg.id;
		}

		if (increasesUnread || msg.highlight) {
			obj.unread = ++this.unread;
		}

		if (msg.highlight) {
			obj.highlight = ++this.highlight;
		}
	}

	client.emit("msg", obj);

	// Never store messages in public mode as the session
	// is completely destroyed when the page gets closed
	if (Helper.config.public) {
		return;
	}

	// showInActive is only processed on "msg", don't need it on page reload
	if (msg.showInActive) {
		delete msg.showInActive;
	}

	this.writeUserLog(client, msg);

	if (Helper.config.maxHistory >= 0 && this.messages.length > Helper.config.maxHistory) {
		const deleted = this.messages.splice(0, this.messages.length - Helper.config.maxHistory);

		// If maxHistory is 0, image would be dereferenced before client had a chance to retrieve it,
		// so for now, just don't implement dereferencing for this edge case.
		if (Helper.config.maxHistory > 0) {
			this.dereferencePreviews(deleted);
		}
	}
};

Chan.prototype.dereferencePreviews = function (messages) {
	if (!Helper.config.prefetch || !Helper.config.prefetchStorage) {
		return;
	}

	messages.forEach((message) => {
		if (message.previews) {
			message.previews.forEach((preview) => {
				if (preview.thumb) {
					storage.dereference(preview.thumb);
					preview.thumb = "";
				}
			});
		}
	});
};

Chan.prototype.getSortedUsers = function (irc) {
	const users = Array.from(this.users.values());

	if (!irc || !irc.network || !irc.network.options || !irc.network.options.PREFIX) {
		return users;
	}

	const userModeSortPriority = {};
	irc.network.options.PREFIX.forEach((prefix, index) => {
		userModeSortPriority[prefix.symbol] = index;
	});

	userModeSortPriority[""] = 99; // No mode is lowest

	return users.sort(function (a, b) {
		if (a.mode === b.mode) {
			return a.nick.toLowerCase() < b.nick.toLowerCase() ? -1 : 1;
		}

		return userModeSortPriority[a.mode] - userModeSortPriority[b.mode];
	});
};

Chan.prototype.findMessage = function (msgId) {
	return this.messages.find((message) => message.id === msgId);
};

Chan.prototype.findUser = function (nick) {
	return this.users.get(nick.toLowerCase());
};

Chan.prototype.getUser = function (nick) {
	return this.findUser(nick) || new User({nick});
};

Chan.prototype.setUser = function (user) {
	this.users.set(user.nick.toLowerCase(), user);
};

Chan.prototype.removeUser = function (user) {
	this.users.delete(user.nick.toLowerCase());
};

/**
 * Get a clean clone of this channel that will be sent to the client.
 * This function performs manual cloning of channel object for
 * better control of performance and memory usage.
 *
 * @param {(int|bool)} lastActiveChannel - Last known active user channel id (needed to control how many messages are sent)
 *                                         If true, channel is assumed active.
 * @param {int} lastMessage - Last message id seen by active client to avoid sending duplicates.
 */
Chan.prototype.getFilteredClone = function (lastActiveChannel, lastMessage) {
	return Object.keys(this).reduce((newChannel, prop) => {
		if (prop === "users") {
			// Do not send users, client requests updated user list whenever needed
			newChannel[prop] = [];
		} else if (prop === "messages") {
			// If client is reconnecting, only send new messages that client has not seen yet
			if (lastMessage > -1) {
				// When reconnecting, always send up to 100 messages to prevent message gaps on the client
				// See https://github.com/thelounge/thelounge/issues/1883
				newChannel[prop] = this[prop].filter((m) => m.id > lastMessage).slice(-100);
			} else {
				// If channel is active, send up to 100 last messages, for all others send just 1
				// Client will automatically load more messages whenever needed based on last seen messages
				const messagesToSend =
					lastActiveChannel === true || this.id === lastActiveChannel ? 100 : 1;

				newChannel[prop] = this[prop].slice(-messagesToSend);
			}

			newChannel.totalMessages = this[prop].length;
		} else {
			newChannel[prop] = this[prop];
		}

		return newChannel;
	}, {});
};

Chan.prototype.writeUserLog = function (client, msg) {
	this.messages.push(msg);

	// Are there any logs enabled
	if (client.messageStorage.length === 0) {
		return;
	}

	let targetChannel = this;

	// Is this particular message or channel loggable
	if (!msg.isLoggable() || !this.isLoggable()) {
		// Because notices are nasty and can be shown in active channel on the client
		// if there is no open query, we want to always log notices in the sender's name
		if (msg.type === Msg.Type.NOTICE && msg.showInActive) {
			targetChannel = {
				name: msg.from.nick,
			};
		} else {
			return;
		}
	}

	// Find the parent network where this channel is in
	const target = client.find(this.id);

	if (!target) {
		return;
	}

	for (const messageStorage of client.messageStorage) {
		messageStorage.index(target.network, targetChannel, msg);
	}
};

Chan.prototype.loadMessages = function (client, network) {
	if (!this.isLoggable() || !client.messageProvider) {
		return;
	}

	client.messageProvider
		.getMessages(network, this)
		.then((messages) => {
			if (messages.length === 0) {
				if (network.irc.network.cap.isEnabled("znc.in/playback")) {
					requestZncPlayback(this, network, 0);
				}

				return;
			}

			this.messages.unshift(...messages);

			if (!this.firstUnread) {
				this.firstUnread = messages[messages.length - 1].id;
			}

			client.emit("more", {
				chan: this.id,
				messages: messages.slice(-100),
				totalMessages: messages.length,
			});

			if (network.irc.network.cap.isEnabled("znc.in/playback")) {
				const from = Math.floor(messages[messages.length - 1].time.getTime() / 1000);

				requestZncPlayback(this, network, from);
			}
		})
		.catch((err) => log.error(`Failed to load messages: ${err}`));
};

Chan.prototype.isLoggable = function () {
	return this.type === Chan.Type.CHANNEL || this.type === Chan.Type.QUERY;
};

Chan.prototype.setMuteStatus = function (muted) {
	this.muted = !!muted;
};

function requestZncPlayback(channel, network, from) {
	network.irc.raw("ZNC", "*playback", "PLAY", channel.name, from.toString());
}
