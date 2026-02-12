<script lang="ts">
	import { page } from '$app/stores';
	import { withBase } from '$lib/path';
</script>

<h1>Profile</h1>
<p>Profile for @{$page.params.handle} – coming soon.</p>
<p><a href={withBase('/')}>Back to feed</a></p>
