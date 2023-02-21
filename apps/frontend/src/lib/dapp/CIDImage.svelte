<script lang="ts">
	import { PUBLIC_IPFS_GATEWAY_URL } from '$env/static/public';

	export let alt: string | undefined = undefined;
	export let cid: string | undefined = undefined;
</script>

<img src="{PUBLIC_IPFS_GATEWAY_URL}{cid}" {alt} />

<style>
	img {
		@apply w-full h-full object-cover;
	}
</style>
