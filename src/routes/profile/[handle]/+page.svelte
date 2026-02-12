<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
</script>

<h1>Profile</h1>
<p>Profile for @{$page.params.handle} – coming soon.</p>
<p><a href="{base || '/'}">Back to feed</a></p>
