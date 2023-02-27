<script lang="ts">
    import { goto } from '$app/navigation';
    import { destroy } from '$lib/dapp/functions';
    import { web3 } from '@candor/ui-kit/web3';
    import { CenteredPanelLayout } from '@candor/ui-kit/layout';
    import { Button } from '@candor/ui-kit/interactive';

    $: if (!$web3.connected) {
        goto('/')
    }
</script>

<CenteredPanelLayout>
    <slot />

    <Button variant="none" on:click={() => {
        destroy();
        goto("/");
    }}>
        <div class="i-tabler-trash" />
        Clear Application Data
    </Button>
</CenteredPanelLayout>
