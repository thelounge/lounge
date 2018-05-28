// The Lounge - https://github.com/thelounge/thelounge
/* global clients */
"use strict";

self.addEventListener("message", function(event) {
	showNotification(event, event.data);
});

self.addEventListener("push", function(event) {
	if (!event.data) {
		return;
	}

	showNotification(event, event.data.json());
});

function showNotification(event, payload) {
	if (payload.type !== "notification") {
		return;
	}

	// get current notification, close it, and draw new
	event.waitUntil(
		self.registration
			.getNotifications({
				tag: `chan-${payload.chanId}`,
			})
			.then((notifications) => {
				for (const notification of notifications) {
					notification.close();
				}

				return self.registration.showNotification(payload.title, {
					tag: `chan-${payload.chanId}`,
					badge: "img/icon-alerted-black-transparent-bg-72x72px.png",
					icon: "img/icon-alerted-grey-bg-192x192px.png",
					body: payload.body,
					timestamp: payload.timestamp,
				});
			})
	);
}

self.addEventListener("notificationclick", function(event) {
	event.notification.close();

	event.waitUntil(clients.matchAll({
		includeUncontrolled: true,
		type: "window",
	}).then((clientList) => {
		if (clientList.length === 0) {
			if (clients.openWindow) {
				return clients.openWindow(`.#${event.notification.tag}`);
			}

			return;
		}

		const client = findSuitableClient(clientList);

		client.postMessage({
			type: "open",
			channel: event.notification.tag,
		});

		if ("focus" in client) {
			client.focus();
		}
	}));
});

function findSuitableClient(clientList) {
	for (let i = 0; i < clientList.length; i++) {
		const client = clientList[i];

		if (client.focused || client.visibilityState === "visible") {
			return client;
		}
	}

	return clientList[0];
}
