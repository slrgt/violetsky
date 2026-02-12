<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
</script>

<h1>Post</h1>
<p>Post detail – coming soon.</p>
<p>URI: {$page.params.uri}</p>
<p><a href="{base || '/'}">Back to feed</a></p>
