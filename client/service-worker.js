// The Lounge - https://github.com/thelounge/thelounge
/* global clients */
"use strict";

const cacheName = "__HASH__";
const excludedPathsFromCache = /^(?:socket\.io|storage|uploads|cdn-cgi)\//;

self.addEventListener("install", function () {
	self.skipWaiting();
});

self.addEventListener("activate", function (event) {
	event.waitUntil(
		caches
			.keys()
			.then((names) =>
				Promise.all(
					names.filter((name) => name !== cacheName).map((name) => caches.delete(name))
				)
			)
	);

	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
	if (event.request.method !== "GET") {
		return;
	}

	const url = event.request.url;
	const scope = self.registration.scope;

	// Skip cross-origin requests
	if (!url.startsWith(scope)) {
		return;
	}

	const path = url.substring(scope.length);

	// Skip ignored paths
	if (excludedPathsFromCache.test(path)) {
		return;
	}

	event.respondWith(networkOrCache(event));
});

async function putInCache(request, response) {
	const cache = await caches.open(cacheName);
	await cache.put(request, response);
}

async function cleanRedirect(response) {
	// Not all browsers support the Response.body stream, so fall back
	// to reading the entire body into memory as a blob.
	const bodyPromise = "body" in response ? Promise.resolve(response.body) : response.blob();

	const body = await bodyPromise;

	// new Response() is happy when passed either a stream or a Blob.
	return new Response(body, {
		headers: response.headers,
		status: response.status,
		statusText: response.statusText,
	});
}

async function networkOrCache(event) {
	try {
		let response = await fetch(event.request, {
			cache: "no-cache",
			redirect: "follow",
		});

		if (response.redirected) {
			response = await cleanRedirect(response.clone());
		}

		if (response.ok) {
			if (cacheName !== "dev") {
				event.waitUntil(putInCache(event.request, response));
			}

			return response.clone();
		}

		throw new Error(`Request failed with HTTP ${response.status}`);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error(e.message, event.request.url);

		if (event.clientId) {
			const client = await clients.get(event.clientId);

			if (client) {
				client.postMessage({
					type: "fetch-error",
					message: e.message,
				});
			}
		}

		const cache = await caches.open(cacheName);
		const matching = await cache.match(event.request);

		return matching || Promise.reject("request-not-in-cache");
	}
}

self.addEventListener("message", function (event) {
	showNotification(event, event.data);
});

self.addEventListener("push", function (event) {
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
				tag: `${payload.networkHost}/${payload.channelName}`,
			})
			.then((notifications) => {
				for (const notification of notifications) {
					notification.close();
				}

				return self.registration.showNotification(payload.title, {
					tag: `${payload.networkHost}/${payload.channelName}`,
					badge: "img/icon-alerted-black-transparent-bg-72x72px.png",
					icon: "img/icon-alerted-grey-bg-192x192px.png",
					body: payload.body,
					timestamp: payload.timestamp,
				});
			})
	);
}

self.addEventListener("notificationclick", function (event) {
	event.notification.close();

	event.waitUntil(
		clients
			.matchAll({
				includeUncontrolled: true,
				type: "window",
			})
			.then((clientList) => {
				if (clientList.length === 0) {
					if (clients.openWindow) {
						return clients.openWindow(`.#/${event.notification.tag}`);
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
			})
	);
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
