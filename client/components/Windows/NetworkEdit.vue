<template>
	<NetworkForm
		v-if="networkData"
		:handle-submit="handleSubmit"
		:defaults="networkData"
		:disabled="disabled"
	/>
</template>

<script>
import socket from "../../js/socket";
import NetworkForm from "../NetworkForm.vue";

export default {
	name: "NetworkEdit",
	components: {
		NetworkForm,
	},
	data() {
		return {
			disabled: false,
			networkData: null,
		};
	},
	watch: {
		"$route.params.uuid"() {
			this.setNetworkData();
		},
	},
	mounted() {
		this.setNetworkData();
	},
	methods: {
		setNetworkData() {
			socket.emit("network:get", this.$route.params.uuid);
			this.networkData = this.$store.getters.findNetwork(this.$route.params.uuid);
		},
		handleSubmit(data) {
			this.disabled = true;
			socket.emit("network:edit", data);

			// TODO: move networks to vuex and update state when the network info comes in
			const network = this.$store.getters.findNetwork(data.uuid);
			network.name = network.channels[0].name = data.name;

			this.$root.switchToChannel(network, network.channels[0]);
		},
	},
};
</script>
