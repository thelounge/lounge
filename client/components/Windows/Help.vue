<template>
	<div id="help" class="window" role="tabpanel" aria-label="Help">
		<div class="header">
			<SidebarToggle />
		</div>
		<div class="container">
			<h1 class="title">Help</h1>

			<h2 class="help-version-title">
				<span>About The Lounge</span>
				<small>
					v{{ $store.state.serverConfiguration.version }} (<router-link
						id="view-changelog"
						to="/changelog"
						>release notes</router-link
					>)
				</small>
			</h2>

			<div class="about">
				<VersionChecker />

				<template v-if="$store.state.serverConfiguration.gitCommit">
					<p>
						The Lounge is running from source (<a
							:href="`https://github.com/thelounge/thelounge/tree/${$store.state.serverConfiguration.gitCommit}`"
							target="_blank"
							rel="noopener"
							>commit <code>{{ $store.state.serverConfiguration.gitCommit }}</code></a
						>).
					</p>

					<ul>
						<li>
							Compare
							<a
								:href="`https://github.com/thelounge/thelounge/compare/${$store.state.serverConfiguration.gitCommit}...master`"
								target="_blank"
								rel="noopener"
								>between
								<code>{{ $store.state.serverConfiguration.gitCommit }}</code> and
								<code>master</code></a
							>
							to see what you are missing
						</li>
						<li>
							Compare
							<a
								:href="`https://github.com/thelounge/thelounge/compare/${$store.state.serverConfiguration.version}...${$store.state.serverConfiguration.gitCommit}`"
								target="_blank"
								rel="noopener"
								>between
								<code>{{ $store.state.serverConfiguration.version }}</code> and
								<code>{{ $store.state.serverConfiguration.gitCommit }}</code></a
							>
							to see your local changes
						</li>
					</ul>
				</template>

				<p>
					<a
						href="https://thelounge.chat/"
						target="_blank"
						rel="noopener"
						class="website-link"
						>Website</a
					>
				</p>
				<p>
					<a
						href="https://thelounge.chat/docs/"
						target="_blank"
						rel="noopener"
						class="documentation-link"
						>Documentation</a
					>
				</p>
				<p>
					<a
						href="https://github.com/thelounge/thelounge/issues/new"
						target="_blank"
						rel="noopener"
						class="report-issue-link"
						>Report an issue…</a
					>
				</p>
			</div>

			<h2>Keyboard Shortcuts</h2>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>↓</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>⇧</kbd> <kbd>↓</kbd></span>
				</div>
				<div class="description">
					<p>Switch to the next lobby in the channel list.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>↑</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>⇧</kbd> <kbd>↑</kbd></span>
				</div>
				<div class="description">
					<p>Switch to the previous lobby in the channel list.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>←</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>⇧</kbd> <kbd>←</kbd></span>
				</div>
				<div class="description">
					<p>Collapse current network.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>→</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>⇧</kbd> <kbd>→</kbd></span>
				</div>
				<div class="description">
					<p>Expand current network.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>↓</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>↓</kbd></span>
				</div>
				<div class="description">
					<p>Switch to the next window in the channel list.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>↑</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>↑</kbd></span>
				</div>
				<div class="description">
					<p>Switch to the previous window in the channel list.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>Ctrl</kbd> <kbd>↓</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>⌘</kbd> <kbd>↓</kbd></span>
				</div>
				<div class="description">
					<p>Switch to the next window with unread messages in the channel list.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>Ctrl</kbd> <kbd>↑</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>⌘</kbd> <kbd>↑</kbd></span>
				</div>
				<div class="description">
					<p>Switch to the previous window with unread messages in the channel list.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>A</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>A</kbd></span>
				</div>
				<div class="description">
					<p>Switch to the first window with unread messages.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>S</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>S</kbd></span>
				</div>
				<div class="description">
					<p>Toggle sidebar.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>U</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>U</kbd></span>
				</div>
				<div class="description">
					<p>Toggle channel user list.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Alt</kbd> <kbd>J</kbd></span>
					<span v-else><kbd>⌥</kbd> <kbd>J</kbd></span>
				</div>
				<div class="description">
					<p>Toggle jump to channel switcher.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span><kbd>Esc</kbd></span>
				</div>
				<div class="description">
					<p>
						Close current contextual window (context menu, image viewer, topic edit,
						etc) and remove focus from input.
					</p>
				</div>
			</div>

			<h2>Formatting Shortcuts</h2>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Ctrl</kbd> <kbd>K</kbd></span>
					<span v-else><kbd>⌘</kbd> <kbd>K</kbd></span>
				</div>
				<div class="description">
					<p>
						Mark any text typed after this shortcut to be colored. After hitting this
						shortcut, enter an integer in the range
						<code>0—15</code> to select the desired color, or use the autocompletion
						menu to choose a color name (see below).
					</p>
					<p>
						Background color can be specified by putting a comma and another integer in
						the range <code>0—15</code> after the foreground color number
						(autocompletion works too).
					</p>
					<p>
						A color reference can be found
						<a
							href="https://modern.ircdocs.horse/formatting.html#colors"
							target="_blank"
							rel="noopener"
							>here</a
						>.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Ctrl</kbd> <kbd>B</kbd></span>
					<span v-else><kbd>⌘</kbd> <kbd>B</kbd></span>
				</div>
				<div class="description">
					<p>
						Mark all text typed after this shortcut as
						<span class="irc-bold">bold</span>.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Ctrl</kbd> <kbd>U</kbd></span>
					<span v-else><kbd>⌘</kbd> <kbd>U</kbd></span>
				</div>
				<div class="description">
					<p>
						Mark all text typed after this shortcut as
						<span class="irc-underline">underlined</span>.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Ctrl</kbd> <kbd>I</kbd></span>
					<span v-else><kbd>⌘</kbd> <kbd>I</kbd></span>
				</div>
				<div class="description">
					<p>
						Mark all text typed after this shortcut as
						<span class="irc-italic">italics</span>.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Ctrl</kbd> <kbd>S</kbd></span>
					<span v-else><kbd>⌘</kbd> <kbd>S</kbd></span>
				</div>
				<div class="description">
					<p>
						Mark all text typed after this shortcut as
						<span class="irc-strikethrough">struck through</span>.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Ctrl</kbd> <kbd>M</kbd></span>
					<span v-else><kbd>⌘</kbd> <kbd>M</kbd></span>
				</div>
				<div class="description">
					<p>
						Mark all text typed after this shortcut as
						<span class="irc-monospace">monospaced</span>.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<span v-if="!isApple"><kbd>Ctrl</kbd> <kbd>O</kbd></span>
					<span v-else><kbd>⌘</kbd> <kbd>O</kbd></span>
				</div>
				<div class="description">
					<p>
						Mark all text typed after this shortcut to be reset to its original
						formatting.
					</p>
				</div>
			</div>

			<h2>Autocompletion</h2>

			<p>
				To auto-complete nicknames, channels, commands, and emoji, type one of the
				characters below to open a suggestion list. Use the <kbd>↑</kbd> and
				<kbd>↓</kbd> keys to highlight an item, and insert it by pressing <kbd>Tab</kbd> or
				<kbd>Enter</kbd> (or by clicking the desired item).
			</p>
			<p>Autocompletion can be disabled in settings.</p>

			<div class="help-item">
				<div class="subject">
					<code>@</code>
				</div>
				<div class="description">
					<p>Nickname</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>#</code>
				</div>
				<div class="description">
					<p>Channel</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/</code>
				</div>
				<div class="description">
					<p>Commands (see list of commands below)</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>:</code>
				</div>
				<div class="description">
					<p>
						Emoji (note: requires two search characters, to avoid conflicting with
						common emoticons like <code>:)</code>)
					</p>
				</div>
			</div>

			<h2>Commands</h2>

			<div class="help-item">
				<div class="subject">
					<code>/away [message]</code>
				</div>
				<div class="description">
					<p>Mark yourself as away with an optional message.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/back</code>
				</div>
				<div class="description">
					<p>Remove your away status (set with <code>/away</code>).</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/ban nick</code>
				</div>
				<div class="description">
					<p>
						Ban (<code>+b</code>) a user from the current channel. This can be a
						nickname or a hostmask.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/banlist</code>
				</div>
				<div class="description">
					<p>Load the banlist for the current channel.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/collapse</code>
				</div>
				<div class="description">
					<p>
						Collapse all previews in the current channel (opposite of
						<code>/expand</code>)
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/connect host [port]</code>
				</div>
				<div class="description">
					<p>
						Connect to a new IRC network. If <code>port</code> starts with a
						<code>+</code> sign, the connection will be made secure using TLS.
					</p>
					<p>Alias: <code>/server</code></p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/ctcp target cmd [args]</code>
				</div>
				<div class="description">
					<p>
						Send a <abbr title="Client-to-client protocol">CTCP</abbr>
						request. Read more about this on
						<a
							href="https://en.wikipedia.org/wiki/Client-to-client_protocol"
							target="_blank"
							rel="noopener"
							>the dedicated Wikipedia article</a
						>.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/deop nick [...nick]</code>
				</div>
				<div class="description">
					<p>
						Remove op (<code>-o</code>) from one or several users in the current
						channel.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/devoice nick [...nick]</code>
				</div>
				<div class="description">
					<p>
						Remove voice (<code>-v</code>) from one or several users in the current
						channel.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/disconnect [message]</code>
				</div>
				<div class="description">
					<p>Disconnect from the current network with an optionally-provided message.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/expand</code>
				</div>
				<div class="description">
					<p>
						Expand all previews in the current channel (opposite of
						<code>/collapse</code>)
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/invite nick [channel]</code>
				</div>
				<div class="description">
					<p>
						Invite a user to the specified channel. If
						<code>channel</code> is omitted, user will be invited to the current
						channel.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/ignore nick</code>
				</div>
				<div class="description">
					<p>
						Block any messages from the specified user on the current network. This can
						be a nickname or a hostmask.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/ignorelist</code>
				</div>
				<div class="description">
					<p>Load the list of ignored users for the current network.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/join channel</code>
				</div>
				<div class="description">
					<p>Join a channel.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/kick nick</code>
				</div>
				<div class="description">
					<p>Kick a user from the current channel.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/list</code>
				</div>
				<div class="description">
					<p>Retrieve a list of available channels on this network.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/me message</code>
				</div>
				<div class="description">
					<p>
						Send an action message to the current channel. The Lounge will display it
						inline, as if the message was posted in the third person.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/mode flags [args]</code>
				</div>
				<div class="description">
					<p>
						Set the given flags to the current channel if the active window is a
						channel, another user if the active window is a private message window, or
						yourself if the current window is a server window.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/msg channel message</code>
				</div>
				<div class="description">
					<p>Send a message to the specified channel.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/nick newnick</code>
				</div>
				<div class="description">
					<p>Change your nickname on the current network.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/notice channel message</code>
				</div>
				<div class="description">
					<p>Sends a notice message to the specified channel.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/op nick [...nick]</code>
				</div>
				<div class="description">
					<p>Give op (<code>+o</code>) to one or several users in the current channel.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/part [channel]</code>
				</div>
				<div class="description">
					<p>
						Close the specified channel or private message window, or the current
						channel if <code>channel</code> is omitted.
					</p>
					<p>Aliases: <code>/close</code>, <code>/leave</code></p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/rejoin</code>
				</div>
				<div class="description">
					<p>
						Leave and immediately rejoin the current channel. Useful to quickly get op
						from ChanServ in an empty channel, for example.
					</p>
					<p>Alias: <code>/cycle</code></p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/query nick</code>
				</div>
				<div class="description">
					<p>Send a private message to the specified user.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/quit [message]</code>
				</div>
				<div class="description">
					<p>Disconnect from the current network with an optional message.</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/raw message</code>
				</div>
				<div class="description">
					<p>Send a raw message to the current IRC network.</p>
					<p>Aliases: <code>/quote</code>, <code>/send</code></p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/slap nick</code>
				</div>
				<div class="description">
					<p>Slap someone in the current channel with a trout!</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/topic [newtopic]</code>
				</div>
				<div class="description">
					<p>
						Get the topic in the current channel. If <code>newtopic</code> is specified,
						sets the topic in the current channel.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/unban nick</code>
				</div>
				<div class="description">
					<p>
						Unban (<code>-b</code>) a user from the current channel. This can be a
						nickname or a hostmask.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/unignore nick</code>
				</div>
				<div class="description">
					<p>
						Unblock messages from the specified user on the current network. This can be
						a nickname or a hostmask.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/voice nick [...nick]</code>
				</div>
				<div class="description">
					<p>
						Give voice (<code>+v</code>) to one or several users in the current channel.
					</p>
				</div>
			</div>

			<div class="help-item">
				<div class="subject">
					<code>/whois nick</code>
				</div>
				<div class="description">
					<p>Retrieve information about the given user on the current network.</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import SidebarToggle from "../SidebarToggle.vue";
import VersionChecker from "../VersionChecker.vue";

export default {
	name: "Help",
	components: {
		SidebarToggle,
		VersionChecker,
	},
	data() {
		return {
			isApple: navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i) || false,
		};
	},
};
</script>
