"use strict";

const i18n = require("i18next");
const i18nXHR = require("i18next-xhr-backend");
const $ = require("jquery");

module.exports = {
	init: function(data, socket) {
		const opts =
			{
				// path where resources get loaded from, or a function
				// returning a path:
				// function(lngs, namespaces) { return customPath; }
				// the returned path will interpolate lng, ns if provided like giving a static path
				loadPath: "locales/{{lng}}.json",
				// allow cross domain requests
				crossDomain: false,

				// allow credentials on cross domain requests
				withCredentials: false
			};
		i18n
			.use(i18nXHR)
			.init({
				backend: opts,
				lng: data.lang, debug: true, load: "all",
				fallbackLng: ["en-US", "fr"]
			}, function() {
				// Only start opening socket.io connection after all events have been registered
				socket.open();

				// Translate text in index.html
				[].forEach.call(document.querySelectorAll("[aria-label]"), (e) => {
					e.setAttribute("aria-label", i18n.t(e.getAttribute("aria-label")));
				});

				[].forEach.call(document.querySelectorAll("[placeholder]"), (e) => {
					e.setAttribute("placeholder", i18n.t(e.getAttribute("placeholder")));
				});

				[].forEach.call(document.querySelectorAll("[data-text-alternate]"), (e) => {
					e.setAttribute("data-text-alternate", i18n.t(e.getAttribute("data-text-alternate")));
				});

				// this is less than ideal.
				const variables = {
					away: "<code>/away</code>",
					channel: "<code>channel</code>",
					ctcp: "<abbr title=\"Client-to-client protocol\">CTCP</abbr>",
					colorRange: "<code>0-15</code>",
					colorDocsBegin: "<a href=\"https://modern.ircdocs.horse/formatting.html#colors\" target=\"_blank\" rel=\"noopener\">",
					colorDocsEnd: "</a>",
					banMode: "<code>+b</code>",
					unbanMode: "<code>-b</code>",
					port: "<code>port</code>",
					plus: "<code>+</code>",
					opMode: "<code>+o</code>",
					deopMode: "<code>-o</code>",
					voiceMode: "<code>+v</code>",
					devoiceMode: "<code>-v</code>"
				};

				let translateOptions = { // eslint-disable-line prefer-const
					interpolation: {escapeValue: false}
				};

				$.extend(translateOptions, variables);
				console.log(translateOptions);
				[].forEach.call(document.querySelectorAll("[data-translate]"), (e) => {
					e.innerHTML = i18n.t(e.textContent.trim(), translateOptions);
				});
			});
	},
	translate: function(key, options) {
		return i18n.t(key, options);
	},
	changeLanguage: function(lang) {
		if (i18n) {
			i18n.changeLanguage(lang); // doesn't actually do anything when changing from Settings
			location.reload();
		}
	}
};
