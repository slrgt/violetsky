/**
 * App store - global state for VioletSky
 */
import { writable, derived } from 'svelte/store';
import type { ThemeMode, ViewColumns, FeedMixEntry, CardViewMode } from '$lib/types';

const defaultFeedMix: FeedMixEntry[] = [
  { source: { kind: 'timeline', label: 'Following' }, percent: 50 },
  {
    source: {
      kind: 'custom',
      label: 'For You',
      uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
    },
    percent: 50,
  },
];

export const appStore = writable({
  session: { did: null as string | null, handle: null as string | null, avatar: null as string | null, isLoggedIn: false },
  theme: 'system' as ThemeMode,
  viewColumns: 2 as ViewColumns,
  feedMix: defaultFeedMix,
  hideSeenPosts: false,
  artOnly: false,
  mediaOnly: false,
  nsfwMode: 'blur' as 'hide' | 'blur' | 'show',
  cardViewMode: 'full' as CardViewMode,
  unreadCount: 0,
  showLoginModal: false,
  showComposeModal: false,
  toastMessage: null as string | null,
  updateAvailable: false,
});

export const isLoggedIn = derived(appStore, ($s) => $s.session.isLoggedIn);
