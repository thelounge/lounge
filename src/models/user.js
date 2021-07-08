"use strict";

const _ = require("lodash");

module.exports = User;

function User(attr, prefix) {
	_.defaults(this, attr, {
		modes: [],
		away: "",
		nick: "",
		lastMessage: 0,
	});

	Object.defineProperty(this, "mode", {
		get() {
			return this.modes[0] || "";
		},
	});

	this.setModes(this.modes, prefix);
}

User.prototype.setModes = function (modes, prefix) {
	// irc-framework sets character mode, but The Lounge works with symbols
	this.modes = modes.map((mode) => prefix.modeToSymbol[mode]);
};

User.prototype.toJSON = function () {
	return {
		nick: this.nick,
		modes: this.modes,
		lastMessage: this.lastMessage,
	};
};
