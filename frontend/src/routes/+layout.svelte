<script lang="ts">
	import 'uno.css';
	import '@unocss/reset/tailwind.css';
	import './layout.css';
</script>

<div id="app">
	<header id="header">
		<a id="brand" href="/">deso</a>
		<nav>
			<a href="/account/sign-up">Sign Up</a>
			<a href="/account/login">Log In</a>
		</nav>
	</header>
	<div id="navbar">
		<nav>
			<a href="/account/sign-up">Sign Up</a>
			<a href="/account/login">Log In</a>
		</nav>
	</div>

	<div id="app-inner">
		<aside id="sidebar">
			<section class="sidebar__panel">
				<form>
					<input type="text" placeholder="Search" />
					<button type="submit">Search</button>
				</form>
			</section>
		</aside>
		<main id="content">
			<slot />
		</main>
	</div>
</div>

<style>
	#app {
		@apply w-23/24 h-7/8 mx-auto my-0 bg-blue-800 rounded-xl shadow;
	}
	#header {
		@apply px-4 py-2 bg-blue-700 flex gap-20px justify-between rounded-t-xl;
	}
	a#brand {
		@apply text-xl text-cyan-100 font-sans;
	}
</style>
