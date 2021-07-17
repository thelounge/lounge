import storage from "./localStorage";
import socket from "./socket";
import {config, createState} from "./settings";

export function createSettingsStore(store) {
	return {
		namespaced: true,
		state: assignStoredSettings(createState(), loadFromLocalStorage()),
		mutations: {
			set(state, {name, value}) {
				state[name] = value;
			},
		},
		actions: {
			syncAll({state}, force = false) {
				if (state.syncSettings === false && force === false) {
					return;
				}

				store.commit("serverHasSettings", true);

				for (const name in state) {
					if (config[name].sync !== "never" || config[name].sync === "always") {
						socket.emit("setting:set", {name, value: state[name]});
					}
				}
			},
			applyAll({state}) {
				for (const settingName in config) {
					config[settingName].apply(store, state[settingName], true);
				}
			},
			update({state, commit}, {name, value, sync = false}) {
				if (state[name] === value) {
					return;
				}

				const settingConfig = config[name];

				// Trying to update a non existing setting (e.g. server has an old key)
				if (!settingConfig) {
					return;
				}

				if (
					sync === false &&
					(state.syncSettings === false || settingConfig.sync === "never")
				) {
					return;
				}

				commit("set", {name, value});
				storage.set("settings", JSON.stringify(state));
				settingConfig.apply(store, value);

				if (!sync) {
					return;
				}

				if (
					(state.syncSettings && settingConfig.sync !== "never") ||
					settingConfig.sync === "always"
				) {
					socket.emit("setting:set", {name, value});
				}
			},
		},
	};
}

function loadFromLocalStorage() {
	let storedSettings;

	try {
		storedSettings = JSON.parse(storage.get("settings"));
	} catch (e) {
		storage.remove("settings");
	}

	if (!storedSettings) {
		return {};
	}

	// Older The Lounge versions converted highlights to an array, turn it back into a string
	if (storedSettings.highlights !== null && typeof storedSettings.highlights === "object") {
		storedSettings.highlights = storedSettings.highlights.join(", ");
	}

	return storedSettings;
}

/**
 * Essentially Object.assign but does not overwrite and only assigns
 * if key exists in both supplied objects and types match
 *
 * @param {object} defaultSettings
 * @param {object} storedSettings
 */
function assignStoredSettings(defaultSettings, storedSettings) {
	const newSettings = {...defaultSettings};

	for (const key in defaultSettings) {
		// Make sure the setting in local storage has the same type that the code expects
		if (
			typeof storedSettings[key] !== "undefined" &&
			typeof defaultSettings[key] === typeof storedSettings[key]
		) {
			newSettings[key] = storedSettings[key];
		}
	}

	return newSettings;
}
