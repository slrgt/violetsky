<script lang="ts">
	import { page } from '$app/stores';
	import { withBase } from '$lib/path';
</script>

<h1>Post</h1>
<p>Post detail – coming soon.</p>
<p>URI: {$page.params.uri}</p>
<p><a href={withBase('/')}>Back to feed</a></p>
