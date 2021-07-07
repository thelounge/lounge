<template>
	<Chat
		v-if="activeChannel"
		:network="activeChannel.network"
		:channel="activeChannel.channel"
		:focused="this.$route.query.focused"
	/>
</template>

<script>
// Temporary component for routing channels and lobbies
import Chat from "./Chat.vue";

export default {
	name: "RoutedChat",
	components: {
		Chat,
	},
	computed: {
		activeChannel() {
			const channel = this.$store.getters.findChannelByName(
				this.$route.params.networkHost,
				this.$route.params.channelName
			);
			return channel;
		},
	},
	watch: {
		activeChannel() {
			this.setActiveChannel();
		},
	},
	mounted() {
		this.setActiveChannel();
	},
	methods: {
		setActiveChannel() {
			this.$store.commit("activeChannel", this.activeChannel);
		},
	},
};
</script>
