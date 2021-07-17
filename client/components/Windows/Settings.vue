<template>
	<div id="settings" class="window" role="tabpanel" aria-label="Settings">
		<div class="header">
			<SidebarToggle />
		</div>
		<form
			ref="settingsForm"
			class="container"
			autocomplete="off"
			@change="onChange"
			@submit.prevent
		>
			<h1 class="title">Settings</h1>

			<div>
				<label class="opt">
					<input
						:checked="$store.state.settings.advanced"
						type="checkbox"
						name="advanced"
					/>
					Advanced settings
				</label>
			</div>

			<div v-if="canRegisterProtocol || hasInstallPromptEvent">
				<h2>Native app</h2>
				<button
					v-if="hasInstallPromptEvent"
					type="button"
					class="btn"
					@click.prevent="nativeInstallPrompt"
				>
					Add The Lounge to Home screen
				</button>
				<button
					v-if="canRegisterProtocol"
					type="button"
					class="btn"
					@click.prevent="registerProtocol"
				>
					Open irc:// URLs with The Lounge
				</button>
			</div>

			<div v-if="!$store.state.serverConfiguration.public && $store.state.settings.advanced">
				<h2>Settings synchronisation</h2>
				<label class="opt">
					<input
						:checked="$store.state.settings.syncSettings"
						type="checkbox"
						name="syncSettings"
					/>
					Synchronize settings with other clients
				</label>
				<template v-if="!$store.state.settings.syncSettings">
					<div v-if="$store.state.serverHasSettings" class="settings-sync-panel">
						<p>
							<strong>Warning:</strong> Checking this box will override the settings
							of this client with those stored on the server.
						</p>
						<p>
							Use the button below to enable synchronization, and override any
							settings already synced to the server.
						</p>
						<button type="button" class="btn btn-small" @click="onForceSyncClick">
							Sync settings and enable
						</button>
					</div>
					<div v-else class="settings-sync-panel">
						<p>
							<strong>Warning:</strong> No settings have been synced before. Enabling
							this will sync all settings of this client as the base for other
							clients.
						</p>
					</div>
				</template>
			</div>

			<h2>Messages</h2>
			<div>
				<label class="opt">
					<input :checked="$store.state.settings.motd" type="checkbox" name="motd" />
					Show <abbr title="Message Of The Day">MOTD</abbr>
				</label>
			</div>
			<div>
				<label class="opt">
					<input
						:checked="$store.state.settings.showSeconds"
						type="checkbox"
						name="showSeconds"
					/>
					Include seconds in timestamp
				</label>
			</div>
			<div>
				<label class="opt">
					<input
						:checked="$store.state.settings.use12hClock"
						type="checkbox"
						name="use12hClock"
					/>
					Use 12-hour timestamps
				</label>
			</div>
			<div v-if="!$store.state.serverConfiguration.public && $store.state.settings.advanced">
				<h2>Automatic away message</h2>

				<label class="opt">
					<label for="awayMessage" class="sr-only">Automatic away message</label>
					<input
						id="awayMessage"
						:value="$store.state.settings.awayMessage"
						type="text"
						name="awayMessage"
						class="input"
						placeholder="Away message if The Lounge is not open"
					/>
				</label>
			</div>
			<h2 id="label-status-messages">
				Status messages
				<span
					class="tooltipped tooltipped-n tooltipped-no-delay"
					aria-label="Joins, parts, quits, kicks, nick changes, and mode changes"
				>
					<button class="extra-help" />
				</span>
			</h2>
			<div role="group" aria-labelledby="label-status-messages">
				<label class="opt">
					<input
						:checked="$store.state.settings.statusMessages === 'shown'"
						type="radio"
						name="statusMessages"
						value="shown"
					/>
					Show all status messages individually
				</label>
				<label class="opt">
					<input
						:checked="$store.state.settings.statusMessages === 'condensed'"
						type="radio"
						name="statusMessages"
						value="condensed"
					/>
					Condense status messages together
				</label>
				<label class="opt">
					<input
						:checked="$store.state.settings.statusMessages === 'hidden'"
						type="radio"
						name="statusMessages"
						value="hidden"
					/>
					Hide all status messages
				</label>
			</div>
			<h2>Visual Aids</h2>
			<div>
				<label class="opt">
					<input
						:checked="$store.state.settings.coloredNicks"
						type="checkbox"
						name="coloredNicks"
					/>
					Enable colored nicknames
				</label>
				<label class="opt">
					<input
						:checked="$store.state.settings.autocomplete"
						type="checkbox"
						name="autocomplete"
					/>
					Enable autocomplete
				</label>
			</div>
			<div v-if="$store.state.settings.advanced">
				<label class="opt">
					<label for="nickPostfix" class="opt">
						Nick autocomplete postfix
						<span
							class="tooltipped tooltipped-n tooltipped-no-delay"
							aria-label="Nick autocomplete postfix (for example a comma)"
						>
							<button class="extra-help" />
						</span>
					</label>
					<input
						id="nickPostfix"
						:value="$store.state.settings.nickPostfix"
						type="text"
						name="nickPostfix"
						class="input"
						placeholder="Nick autocomplete postfix (e.g. ', ')"
					/>
				</label>
			</div>

			<h2>Theme</h2>
			<div>
				<label for="theme-select" class="sr-only">Theme</label>
				<select
					id="theme-select"
					:value="$store.state.settings.theme"
					name="theme"
					class="input"
				>
					<option
						v-for="theme in $store.state.serverConfiguration.themes"
						:key="theme.name"
						:value="theme.name"
					>
						{{ theme.displayName }}
					</option>
				</select>
			</div>

			<template v-if="$store.state.serverConfiguration.prefetch">
				<h2>Link previews</h2>
				<div>
					<label class="opt">
						<input
							:checked="$store.state.settings.media"
							type="checkbox"
							name="media"
						/>
						Auto-expand media
					</label>
				</div>
				<div>
					<label class="opt">
						<input
							:checked="$store.state.settings.links"
							type="checkbox"
							name="links"
						/>
						Auto-expand websites
					</label>
				</div>
			</template>

			<div
				v-if="$store.state.settings.advanced && $store.state.serverConfiguration.fileUpload"
			>
				<h2>File uploads</h2>
				<div>
					<label class="opt">
						<input
							:checked="$store.state.settings.uploadCanvas"
							type="checkbox"
							name="uploadCanvas"
						/>
						Attempt to remove metadata from images before uploading
						<span
							class="tooltipped tooltipped-n tooltipped-no-delay"
							aria-label="This option renders the image into a canvas element to remove metadata from the image.
This may break orientation if your browser does not support that."
						>
							<button class="extra-help" />
						</span>
					</label>
				</div>
			</div>

			<template v-if="!$store.state.serverConfiguration.public">
				<h2>Push Notifications</h2>
				<div>
					<button
						id="pushNotifications"
						type="button"
						class="btn"
						:disabled="
							$store.state.pushNotificationState !== 'supported' &&
							$store.state.pushNotificationState !== 'subscribed'
						"
						@click="onPushButtonClick"
					>
						<template v-if="$store.state.pushNotificationState === 'subscribed'">
							Unsubscribe from push notifications
						</template>
						<template v-else-if="$store.state.pushNotificationState === 'loading'">
							Loading…
						</template>
						<template v-else> Subscribe to push notifications </template>
					</button>
					<div v-if="$store.state.pushNotificationState === 'nohttps'" class="error">
						<strong>Warning</strong>: Push notifications are only supported over HTTPS
						connections.
					</div>
					<div v-if="$store.state.pushNotificationState === 'unsupported'" class="error">
						<strong>Warning</strong>:
						<span>Push notifications are not supported by your browser.</span>

						<div v-if="isIOS" class="apple-push-unsupported">
							Safari does
							<a
								href="https://bugs.webkit.org/show_bug.cgi?id=182566"
								target="_blank"
								rel="noopener"
								>not support the web push notification specification</a
							>, and because all browsers on iOS use Safari under the hood, The Lounge
							is unable to provide push notifications on iOS devices.
						</div>
					</div>
				</div>
			</template>

			<h2>Browser Notifications</h2>
			<div>
				<label class="opt">
					<input
						id="desktopNotifications"
						:checked="$store.state.settings.desktopNotifications"
						:disabled="$store.state.desktopNotificationState === 'nohttps'"
						type="checkbox"
						name="desktopNotifications"
					/>
					Enable browser notifications<br />
					<div
						v-if="$store.state.desktopNotificationState === 'unsupported'"
						class="error"
					>
						<strong>Warning</strong>: Notifications are not supported by your browser.
					</div>
					<div
						v-if="$store.state.desktopNotificationState === 'nohttps'"
						id="warnBlockedDesktopNotifications"
						class="error"
					>
						<strong>Warning</strong>: Notifications are only supported over HTTPS
						connections.
					</div>
					<div
						v-if="$store.state.desktopNotificationState === 'blocked'"
						id="warnBlockedDesktopNotifications"
						class="error"
					>
						<strong>Warning</strong>: Notifications are blocked by your browser.
					</div>
				</label>
			</div>
			<div>
				<label class="opt">
					<input
						:checked="$store.state.settings.notification"
						type="checkbox"
						name="notification"
					/>
					Enable notification sound
				</label>
			</div>
			<div>
				<div class="opt">
					<button id="play" @click.prevent="playNotification">Play sound</button>
				</div>
			</div>

			<div v-if="$store.state.settings.advanced">
				<label class="opt">
					<input
						:checked="$store.state.settings.notifyAllMessages"
						type="checkbox"
						name="notifyAllMessages"
					/>
					Enable notification for all messages
				</label>
			</div>

			<div v-if="!$store.state.serverConfiguration.public && $store.state.settings.advanced">
				<label class="opt">
					<label for="highlights" class="opt">
						Custom highlights
						<span
							class="tooltipped tooltipped-n tooltipped-no-delay"
							aria-label="If a message contains any of these comma-separated 
expressions, it will trigger a highlight."
						>
							<button class="extra-help" />
						</span>
					</label>
					<input
						id="highlights"
						:value="$store.state.settings.highlights"
						type="text"
						name="highlights"
						class="input"
						placeholder="Comma-separated, e.g.: word, some more words, anotherword"
					/>
				</label>
			</div>

			<div v-if="!$store.state.serverConfiguration.public && $store.state.settings.advanced">
				<label class="opt">
					<label for="highlightExceptions" class="opt">
						Highlight exceptions
						<span
							class="tooltipped tooltipped-n tooltipped-no-delay"
							aria-label="If a message contains any of these comma-separated 
expressions, it will not trigger a highlight even if it contains 
your nickname or expressions defined in custom highlights."
						>
							<button class="extra-help" />
						</span>
					</label>
					<input
						id="highlightExceptions"
						:value="$store.state.settings.highlightExceptions"
						type="text"
						name="highlightExceptions"
						class="input"
						placeholder="Comma-separated, e.g.: word, some more words, anotherword"
					/>
				</label>
			</div>

			<div
				v-if="
					!$store.state.serverConfiguration.public &&
					!$store.state.serverConfiguration.ldapEnabled
				"
				id="change-password"
				role="group"
				aria-labelledby="label-change-password"
			>
				<h2 id="label-change-password">Change password</h2>
				<div class="password-container">
					<label for="current-password" class="sr-only"> Enter current password </label>
					<RevealPassword v-slot:default="slotProps">
						<input
							id="current-password"
							autocomplete="current-password"
							:type="slotProps.isVisible ? 'text' : 'password'"
							name="old_password"
							class="input"
							placeholder="Enter current password"
						/>
					</RevealPassword>
				</div>
				<div class="password-container">
					<label for="new-password" class="sr-only"> Enter desired new password </label>
					<RevealPassword v-slot:default="slotProps">
						<input
							id="new-password"
							:type="slotProps.isVisible ? 'text' : 'password'"
							name="new_password"
							autocomplete="new-password"
							class="input"
							placeholder="Enter desired new password"
						/>
					</RevealPassword>
				</div>
				<div class="password-container">
					<label for="new-password-verify" class="sr-only"> Repeat new password </label>
					<RevealPassword v-slot:default="slotProps">
						<input
							id="new-password-verify"
							:type="slotProps.isVisible ? 'text' : 'password'"
							name="verify_password"
							autocomplete="new-password"
							class="input"
							placeholder="Repeat new password"
						/>
					</RevealPassword>
				</div>
				<div
					v-if="passwordChangeStatus && passwordChangeStatus.success"
					class="feedback success"
				>
					Successfully updated your password
				</div>
				<div
					v-else-if="passwordChangeStatus && passwordChangeStatus.error"
					class="feedback error"
				>
					{{ passwordErrors[passwordChangeStatus.error] }}
				</div>
				<div>
					<button type="submit" class="btn" @click.prevent="changePassword">
						Change password
					</button>
				</div>
			</div>

			<div v-if="$store.state.settings.advanced">
				<h2>Custom Stylesheet</h2>
				<label for="user-specified-css-input" class="sr-only">
					Custom stylesheet. You can override any style with CSS here.
				</label>
				<textarea
					id="user-specified-css-input"
					:value="$store.state.settings.userStyles"
					class="input"
					name="userStyles"
					placeholder="/* You can override any style with CSS here */"
				/>
			</div>

			<div v-if="!$store.state.serverConfiguration.public" class="session-list" role="group">
				<h2>Sessions</h2>

				<h3>Current session</h3>
				<Session v-if="currentSession" :session="currentSession" />

				<template v-if="activeSessions.length > 0">
					<h3>Active sessions</h3>
					<Session
						v-for="session in activeSessions"
						:key="session.token"
						:session="session"
					/>
				</template>

				<h3>Other sessions</h3>
				<p v-if="$store.state.sessions.length === 0">Loading…</p>
				<p v-else-if="otherSessions.length === 0">
					<em>You are not currently logged in to any other device.</em>
				</p>
				<Session
					v-for="session in otherSessions"
					v-else
					:key="session.token"
					:session="session"
				/>
			</div>
		</form>
	</div>
</template>

<style>
textarea#user-specified-css-input {
	height: 100px;
}
</style>

<script>
import socket from "../../js/socket";
import webpush from "../../js/webpush";
import RevealPassword from "../RevealPassword.vue";
import Session from "../Session.vue";
import SidebarToggle from "../SidebarToggle.vue";

let installPromptEvent = null;

window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	installPromptEvent = e;
});

export default {
	name: "Settings",
	components: {
		RevealPassword,
		Session,
		SidebarToggle,
	},
	data() {
		return {
			canRegisterProtocol: false,
			passwordChangeStatus: null,
			passwordErrors: {
				missing_fields: "Please enter a new password",
				password_mismatch: "Both new password fields must match",
				password_incorrect:
					"The current password field does not match your account password",
				update_failed: "Failed to update your password",
			},
			isIOS: navigator.platform.match(/(iPhone|iPod|iPad)/i) || false,
		};
	},
	computed: {
		hasInstallPromptEvent() {
			// TODO: This doesn't hide the button after clicking
			return installPromptEvent !== null;
		},
		currentSession() {
			return this.$store.state.sessions.find((item) => item.current);
		},
		activeSessions() {
			return this.$store.state.sessions.filter((item) => !item.current && item.active > 0);
		},
		otherSessions() {
			return this.$store.state.sessions.filter((item) => !item.current && !item.active);
		},
	},
	mounted() {
		socket.emit("sessions:get");

		// Enable protocol handler registration if supported,
		// and the network configuration is not locked
		this.canRegisterProtocol =
			window.navigator.registerProtocolHandler &&
			!this.$store.state.serverConfiguration.lockNetwork;
	},
	methods: {
		onChange(event) {
			const ignore = ["old_password", "new_password", "verify_password"];

			const name = event.target.name;

			if (ignore.includes(name)) {
				return;
			}

			let value;

			if (event.target.type === "checkbox") {
				value = event.target.checked;
			} else {
				value = event.target.value;
			}

			this.$store.dispatch("settings/update", {name, value, sync: true});
		},
		changePassword() {
			const allFields = new FormData(this.$refs.settingsForm);
			const data = {
				old_password: allFields.get("old_password"),
				new_password: allFields.get("new_password"),
				verify_password: allFields.get("verify_password"),
			};

			if (!data.old_password || !data.new_password || !data.verify_password) {
				this.passwordChangeStatus = {
					success: false,
					error: "missing_fields",
				};
				return;
			}

			if (data.new_password !== data.verify_password) {
				this.passwordChangeStatus = {
					success: false,
					error: "password_mismatch",
				};
				return;
			}

			socket.once("change-password", (response) => {
				this.passwordChangeStatus = response;
			});

			socket.emit("change-password", data);
		},
		onForceSyncClick() {
			this.$store.dispatch("settings/syncAll", true);
			this.$store.dispatch("settings/update", {
				name: "syncSettings",
				value: true,
				sync: true,
			});
		},
		registerProtocol() {
			const uri = document.location.origin + document.location.pathname + "?uri=%s";

			window.navigator.registerProtocolHandler("irc", uri, "The Lounge");
			window.navigator.registerProtocolHandler("ircs", uri, "The Lounge");
		},
		nativeInstallPrompt() {
			installPromptEvent.prompt();
			installPromptEvent = null;
		},
		playNotification() {
			const pop = new Audio();
			pop.src = "audio/pop.wav";
			pop.play();
		},
		onPushButtonClick() {
			webpush.togglePushSubscription();
		},
	},
};
</script>
