<template>
	<form
		:id="'join-channel-' + channel.id"
		class="join-form"
		method="post"
		action=""
		autocomplete="off"
		@keydown.esc.prevent="$emit('toggle-join-channel')"
		@submit.prevent="onSubmit"
	>
		<input
			v-model="inputChannel"
			v-focus
			type="text"
			class="input"
			name="channel"
			placeholder="Channel"
			pattern="[^\s]+"
			maxlength="200"
			title="The channel name may not contain spaces"
			required
		/>
		<input
			v-model="inputPassword"
			type="password"
			class="input"
			name="key"
			placeholder="Password (optional)"
			pattern="[^\s]+"
			maxlength="200"
			title="The channel password may not contain spaces"
			autocomplete="new-password"
		/>
		<button type="submit" class="btn btn-small">Join</button>
	</form>
</template>

<script>
import socket from "../js/socket";

export default {
	name: "JoinChannel",
	directives: {
		focus: {
			inserted(el) {
				el.focus();
			},
		},
	},
	props: {
		network: Object,
		channel: Object,
	},
	data() {
		return {
			inputChannel: this.$route.query.channel || "",
			inputPassword: this.$route.query.password || "",
		};
	},
	methods: {
		onSubmit() {
			const existingChannel = this.$store.getters.findChannelOnCurrentNetwork(
				this.inputChannel
			);

			if (existingChannel) {
				this.$root.switchToChannel(this.$store.activeChannel.network, existingChannel);
			} else {
				const chanTypes = this.network.serverOptions.CHANTYPES;
				let channel = this.inputChannel;

				if (chanTypes && chanTypes.length > 0 && !chanTypes.includes(channel[0])) {
					channel = chanTypes[0] + channel;
				}

				socket.emit("input", {
					text: `/join ${channel} ${this.inputPassword}`,
					target: this.channel.id,
				});
			}

			this.inputChannel = "";
			this.inputPassword = "";
			this.$emit("toggle-join-channel");
		},
	},
};
</script>
