var _ = require("lodash");
var Msg = require("../../models/msg");

exports.commands = ["close", "leave", "part"];
exports.allowDisconnected = true;

exports.input = function(network, chan, cmd, args) {
	if (chan.type === "lobby") {
		chan.pushMessage(this, new Msg({
			type: Msg.Type.ERROR,
			text: "You can not part from networks, use /quit instead."
		}));
		return;
	}

	network.channels = _.without(network.channels, chan);
	this.emit("part", {
		chan: chan.id
	});

	if (chan.type === "channel") {
		this.save();

		if (network.irc) {
			network.irc.part(chan.name, args.join(" "));
		}
	}

	return true;
};
