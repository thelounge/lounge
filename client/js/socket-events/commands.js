const constants = require("../constants");
import localCommands from "../commands/index";
import socket from "../socket";

const clientCommands = Object.keys(localCommands).map((cmd) => `/${cmd}`);

socket.on("commands", function (commands) {
	if (commands) {
		const cmds = [...new Set(commands.concat(clientCommands))];
		constants.commands = cmds.sort();
	}
});
