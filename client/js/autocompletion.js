"use strict";

const constants = require("./constants");

import Mousetrap from "mousetrap";
import {Textcomplete, Textarea} from "textcomplete";
import fuzzy from "fuzzy";

import emojiMap from "./helpers/simplemap.json";
import store from "./store";

export default enableAutocomplete;

const emojiSearchTerms = Object.keys(emojiMap);
const emojiStrategy = {
	id: "emoji",
	match: /(^|\s):([-+\w:?]{2,}):?$/,
	search(term, callback) {
		// Trim colon from the matched term,
		// as we are unable to get a clean string from match regex
		term = term.replace(/:$/, "");
		callback(fuzzyGrep(term, emojiSearchTerms));
	},
	template([string, original]) {
		return `<span class="emoji">${emojiMap[original]}</span> ${string}`;
	},
	replace([, original]) {
		return "$1" + emojiMap[original];
	},
	index: 2,
};

const nicksStrategy = {
	id: "nicks",
	match: /(^|\s)(@([a-zA-Z_[\]\\^{}|`@][a-zA-Z0-9_[\]\\^{}|`-]*)?)$/,
	search(term, callback) {
		term = term.slice(1);

		if (term[0] === "@") {
			callback(completeNicks(term.slice(1), true).map((val) => ["@" + val[0], "@" + val[1]]));
		} else {
			callback(completeNicks(term, true));
		}
	},
	template([string]) {
		return string;
	},
	replace([, original]) {
		return "$1" + replaceNick(original);
	},
	index: 2,
};

const chanStrategy = {
	id: "chans",
	match: /(^|\s)((?:#|\+|&|![A-Z0-9]{5})(?:[^\s]+)?)$/,
	search(term, callback) {
		callback(completeChans(term));
	},
	template([string]) {
		return string;
	},
	replace([, original]) {
		return "$1" + original;
	},
	index: 2,
};

const commandStrategy = {
	id: "commands",
	match: /^\/(\w*)$/,
	search(term, callback) {
		callback(completeCommands("/" + term));
	},
	template([string]) {
		return string;
	},
	replace([, original]) {
		return original;
	},
	index: 1,
};

const foregroundColorStrategy = {
	id: "foreground-colors",
	match: /\x03(\d{0,2}|[A-Za-z ]{0,10})$/,
	search(term, callback) {
		term = term.toLowerCase();

		const matchingColorCodes = constants.colorCodeMap
			.filter((i) => fuzzy.test(term, i[0]) || fuzzy.test(term, i[1]))
			.map((i) => {
				if (fuzzy.test(term, i[1])) {
					return [
						i[0],
						fuzzy.match(term, i[1], {
							pre: "<b>",
							post: "</b>",
						}).rendered,
					];
				}

				return i;
			});

		callback(matchingColorCodes);
	},
	template(value) {
		return `<span class="irc-fg${parseInt(value[0], 10)}">${value[1]}</span>`;
	},
	replace(value) {
		return "\x03" + value[0];
	},
	index: 1,
};

const backgroundColorStrategy = {
	id: "background-colors",
	match: /\x03(\d{2}),(\d{0,2}|[A-Za-z ]{0,10})$/,
	search(term, callback, match) {
		term = term.toLowerCase();
		const matchingColorCodes = constants.colorCodeMap
			.filter((i) => fuzzy.test(term, i[0]) || fuzzy.test(term, i[1]))
			.map((pair) => {
				if (fuzzy.test(term, pair[1])) {
					return [
						pair[0],
						fuzzy.match(term, pair[1], {
							pre: "<b>",
							post: "</b>",
						}).rendered,
					];
				}

				return pair;
			})
			.map((pair) => pair.concat(match[1])); // Needed to pass fg color to `template`...

		callback(matchingColorCodes);
	},
	template(value) {
		return `<span class="irc-fg${parseInt(value[2], 10)} irc-bg irc-bg${parseInt(
			value[0],
			10
		)}">${value[1]}</span>`;
	},
	replace(value) {
		return "\x03$1," + value[0];
	},
	index: 2,
};

function enableAutocomplete(input) {
	let tabCount = 0;
	let lastMatch = "";
	let currentMatches = [];

	input.addEventListener("input", (e) => {
		if (e.detail === "autocomplete") {
			return;
		}

		tabCount = 0;
		currentMatches = [];
		lastMatch = "";
	});

	Mousetrap(input).bind(
		"tab",
		(e) => {
			if (store.state.isAutoCompleting) {
				return;
			}

			e.preventDefault();

			const text = input.value;

			if (tabCount === 0) {
				lastMatch = text.substring(0, input.selectionStart).split(/\s/).pop();

				if (lastMatch.length === 0) {
					return;
				}

				currentMatches = completeNicks(lastMatch, false);

				if (currentMatches.length === 0) {
					return;
				}
			}

			const position = input.selectionStart - lastMatch.length;
			const newMatch = replaceNick(
				currentMatches[tabCount % currentMatches.length],
				position
			);
			const remainder = text.substr(input.selectionStart);

			input.value = text.substr(0, position) + newMatch + remainder;
			input.selectionStart -= remainder.length;
			input.selectionEnd = input.selectionStart;

			// Propagate change to Vue model
			input.dispatchEvent(
				new CustomEvent("input", {
					detail: "autocomplete",
				})
			);

			lastMatch = newMatch;
			tabCount++;
		},
		"keydown"
	);

	const editor = new Textarea(input);
	const textcomplete = new Textcomplete(editor, {
		dropdown: {
			className: "textcomplete-menu",
			placement: "top",
		},
	});

	textcomplete.register([
		emojiStrategy,
		nicksStrategy,
		chanStrategy,
		commandStrategy,
		foregroundColorStrategy,
		backgroundColorStrategy,
	]);

	// Activate the first item by default
	// https://github.com/yuku-t/textcomplete/issues/93
	textcomplete.on("rendered", () => {
		if (textcomplete.dropdown.items.length > 0) {
			textcomplete.dropdown.items[0].activate();
		}
	});

	textcomplete.on("show", () => {
		store.commit("isAutoCompleting", true);
	});

	textcomplete.on("hidden", () => {
		store.commit("isAutoCompleting", false);
	});

	return {
		hide() {
			textcomplete.hide();
		},
		destroy() {
			textcomplete.destroy();
			store.commit("isAutoCompleting", false);
		},
	};
}

function replaceNick(original, position = 1) {
	// If no postfix specified, return autocompleted nick as-is
	if (!store.state.settings.nickPostfix) {
		return original;
	}

	// If there is whitespace in the input already, append space to nick
	if (position > 0 && /\s/.test(store.state.activeChannel.channel.pendingMessage)) {
		return original + " ";
	}

	// If nick is first in the input, append specified postfix
	return original + store.state.settings.nickPostfix;
}

function fuzzyGrep(term, array) {
	const results = fuzzy.filter(term, array, {
		pre: "<b>",
		post: "</b>",
	});
	return results.map((el) => [el.string, el.original]);
}

function rawNicks() {
	if (store.state.activeChannel.channel.users.length > 0) {
		const users = store.state.activeChannel.channel.users.slice();

		return users.sort((a, b) => b.lastMessage - a.lastMessage).map((u) => u.nick);
	}

	const me = store.state.activeChannel.network.nick;
	const otherUser = store.state.activeChannel.channel.name;

	// If this is a query, add their name to autocomplete
	if (me !== otherUser && store.state.activeChannel.channel.type === "query") {
		return [otherUser, me];
	}

	// Return our own name by default for anything that isn't a channel or query
	return [me];
}

function completeNicks(word, isFuzzy) {
	const users = rawNicks();
	word = word.toLowerCase();

	if (isFuzzy) {
		return fuzzyGrep(word, users);
	}

	return users.filter((w) => !w.toLowerCase().indexOf(word));
}

function getCommands() {
	const cmds = constants.commands.slice();

	if (store.state.settings.searchEnabled === false) {
		const search = cmds.indexOf("/search");

		if (search !== -1) {
			cmds.splice(search, 1);
		}
	}

	return cmds;
}

function completeCommands(word) {
	const words = getCommands();

	return fuzzyGrep(word, words);
}

function completeChans(word) {
	const words = [];

	for (const channel of store.state.activeChannel.network.channels) {
		// Push all channels that start with the same CHANTYPE
		if (channel.type === "channel" && channel.name[0] === word[0]) {
			words.push(channel.name);
		}
	}

	return fuzzyGrep(word, words);
}
