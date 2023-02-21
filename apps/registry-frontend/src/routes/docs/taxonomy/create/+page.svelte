<script lang="ts">
	import { Typography, Breadcrumb, Input, Select, Button } from '@candor/ui-kit';

	const values = {
		type: 'category',
		title: '',
		parent: ''
	};

	async function onSubmit() {
		console.info('submit');
	}
</script>

<div class="flex flex-col gap-2 px-4 py-2">
	<Breadcrumb
		sections={[
			{ label: 'Taxonomy', path: '/taxonomy' },
			{ label: 'Create Category or Topic', path: '/taxonomy/create' }
		]}
	/>
	<Typography>Create a Category or Topic</Typography>
	<p>
		Categories and Topics are used to classify <a href="/registry">Registry</a> entries.
	</p>

	<form on:submit|preventDefault={onSubmit}>
		<Select
			id="type"
			label="Type"
			options={[
				{ label: 'Category', value: 'category' },
				{ label: 'Topic', value: 'topic' }
			]}
			width="w-full"
			bind:value={values.type}
		/>

		<Select
			id="parent"
			label={values.type === 'category' ? 'Parent Category' : 'Category'}
			width="w-full"
			options={[{ label: '(None)', value: '' }]}
			bind:value={values.parent}
		/>

		{#if values.type === 'category' || values.parent}
			<Input
				id="title"
				label="Title"
				placeholder="{values.type === 'topic' ? 'Topic' : 'Category'} Title"
				width="w-full"
				bind:value={values.title}
			/>

			<Input
				id="description"
				label="Description"
				type="textarea"
				placeholder="{values.type === 'topic' ? 'Topic' : 'Category'} Description"
				width="w-full"
			/>

			<div class="text-red-400 flex items-center gap-4">
				<div class="i-tabler-alert-triangle text-4xl" />
				<div>
					<p>
						Double-check spelling and make sure an analogous topic or category does not already
						exist.
					</p>
					<p>Be sure to place your category within any applicable categories.</p>
					<p>
						Misuse of the registry can result in account suspension and loss of airdrop eligibility
						and/or staked funds.
					</p>
				</div>
			</div>
		{/if}

		<div class="flex justify-end mt-4">
			{#if values.type === 'topic' && !values.parent}
				<div class="text-red-400 flex items-center gap-4">
					<div class="i-tabler-alert-triangle text-4xl" />
					<div>
						<p>Select a parent category to create a topic.</p>
					</div>
				</div>
			{:else}
				<Button type="submit">
					<div class="i-tabler-plus" />
					Create {values.type === 'topic' ? 'Topic' : 'Category'}
				</Button>
			{/if}
		</div>
	</form>
</div>
