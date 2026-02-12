<script lang="ts">
	import { page } from '$app/stores';
	import { withBase } from '$lib/path';
</script>

<h1>Search</h1>
<p>Search people or posts – coming soon.</p>
{#if $page.url.searchParams.get('q')}
	<p>Query: {$page.url.searchParams.get('q')}</p>
{/if}
<p><a href={withBase('/')}>Back to feed</a></p>
