"use strict";

import store from "../store";
import {router} from "../router";
const Msg = require("../../../src/models/msg");

function input(args) {
	const {channel} = store.state.activeChannel;

	if (!store.state.settings.searchEnabled) {
		const message = new Msg({
			type: Msg.Type.ERROR,
			text: "Search is currently not enabled.",
		});
		channel.messages.push(message);
	} else {
		router.push({
			name: "SearchResults",
			params: {
				id: channel.id,
			},
			query: {
				q: args.join(" "),
			},
		});
	}

	return true;
}

export default {input};
