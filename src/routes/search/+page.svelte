<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
</script>

<h1>Search</h1>
<p>Search people or posts – coming soon.</p>
{#if $page.url.searchParams.get('q')}
	<p>Query: {$page.url.searchParams.get('q')}</p>
{/if}
<p><a href="{base || '/'}">Back to feed</a></p>
