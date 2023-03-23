<script lang="ts">
	import { Typography } from '@candor/ui-kit/content';
	import { Button } from '@candor/ui-kit/interactive';
</script>

<div class="p-8 overflow-auto flex flex-col gap-4 relative">
	<div class="flex flex-row justify-between items-center">
		<Typography>Connecting to Candor</Typography>
		<Button size="xl" href="/connect">
			<div class="i-tabler-arrow-left" />
			Back
		</Button>
	</div>

	<Typography el="h2" classes="mt-4">What is an account key?</Typography>
	<Typography el="p">
		An account key is a cryptographic key that is used to encrypt and decrypt your data. It is used
		to sign transactions and is the only way to access your account. It is stored locally on your
		device and is never sent to the Candor network.
	</Typography>

	<Typography el="p">
		You can create a new account key or import an existing one. If you import an existing key, you
		will be able to access your account and all of your data.
	</Typography>

	<Typography el="p">
		If you create a new account key, you will be able to access your account and all of your data.
		However, you will not be able to access your account if you lose your key.
	</Typography>

	<Typography el="p">If you are unsure, we recommend creating a new account key.</Typography>

	<Typography el="h2" classes="mt-4">Why would I want to use a crypto wallet?</Typography>

	<Typography el="p">
		If you have a crypto wallet, you can use it to sign transactions and access your account. This
		allows you to use your wallet to access your account and all of your data. This also allows you
		to use your wallet for crypto transactions and to verify your identity and ownership of tokens.
	</Typography>

	<Typography el="p">If you are unsure, we recommend creating a new account key.</Typography>

	<Typography el="h2" classes="mt-4">Why can't I just use my e-mail address?</Typography>

	<Typography el="p">
		We don't store any of your personal information. Anything you store is encrypted and stored on
		your device and IPFS. We don't have access to your data and we don't know who you are. In the
		future, we may allow you to use your e-mail address to access your account, but for now, we
		think it presents a security risk for uninformed users.
	</Typography>

	<div class="flex flex-row justify-end items-center">
		<Button size="xl" href="/connect">
			<div class="i-tabler-arrow-left" />
			Back
		</Button>
	</div>
</div>
