/**
 * AT Protocol (Bluesky) Client Library - VioletSky
 */
import { Agent, AtpAgent, RichText } from '@atproto/api';
import type { AtpSessionData, AtpSessionEvent } from '@atproto/api';
import type { TimelineItem, PostView, PostMediaInfo, FeedMixEntry } from '$lib/types';

const BSKY_SERVICE = 'https://bsky.social';
const PUBLIC_BSKY = 'https://public.api.bsky.app';
const SESSION_KEY = 'violetsky-bsky-session';
const ACCOUNTS_KEY = 'violetsky-accounts';
const OAUTH_ACCOUNTS_KEY = 'violetsky-oauth-accounts';
const ACCOUNT_PROFILES_KEY = 'violetsky-account-profiles';
const DOWNVOTE_COLLECTION = 'app.artsky.feed.downvote';

type AccountsStore = { activeDid: string | null; sessions: Record<string, AtpSessionData> };
type OAuthAccountsStore = { activeDid: string | null; dids: string[] };

export type AccountProfile = { did: string; handle: string; avatar?: string; displayName?: string };

let oauthAgentInstance: Agent | null = null;
let oauthSessionRef: { signOut(): Promise<void> } | null = null;

function getAccounts(): AccountsStore {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ACCOUNTS_KEY) : null;
    if (!raw) return { activeDid: null, sessions: {} };
    const parsed = JSON.parse(raw) as AccountsStore;
    return { activeDid: parsed.activeDid ?? null, sessions: parsed.sessions ?? {} };
  } catch {
    return { activeDid: null, sessions: {} };
  }
}

function saveAccounts(accounts: AccountsStore): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch { /* ignore */ }
}

function getOAuthAccounts(): OAuthAccountsStore {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(OAUTH_ACCOUNTS_KEY) : null;
    if (!raw) return { activeDid: null, dids: [] };
    const parsed = JSON.parse(raw) as OAuthAccountsStore;
    return { activeDid: parsed.activeDid ?? null, dids: Array.isArray(parsed.dids) ? parsed.dids : [] };
  } catch {
    return { activeDid: null, dids: [] };
  }
}

function saveOAuthAccounts(store: OAuthAccountsStore): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(OAUTH_ACCOUNTS_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

function persistSession(_evt: AtpSessionEvent, session: AtpSessionData | undefined): void {
  const accounts = getAccounts();
  if (session) {
    accounts.sessions[session.did] = session;
    accounts.activeDid = session.did;
    saveAccounts(accounts);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
  } else {
    if (accounts.activeDid) {
      delete accounts.sessions[accounts.activeDid];
      const remaining = Object.keys(accounts.sessions);
      accounts.activeDid = remaining[0] ?? null;
      saveAccounts(accounts);
    }
    try {
      if (typeof localStorage !== 'undefined') {
        if (accounts.activeDid) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(accounts.sessions[accounts.activeDid]));
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch { /* ignore */ }
  }
}

const credentialAgent = new AtpAgent({ service: BSKY_SERVICE, persistSession });
export const publicAgent = new AtpAgent({ service: PUBLIC_BSKY });

export function getAgent(): AtpAgent | Agent {
  return oauthAgentInstance ?? credentialAgent;
}

export const agent = new Proxy(credentialAgent, {
  get(_, prop) {
    return (getAgent() as unknown as Record<string, unknown>)[prop as string];
  },
});

export function setOAuthAgent(agentInstance: Agent | null, session?: { signOut(): Promise<void> } | null): void {
  oauthAgentInstance = agentInstance;
  oauthSessionRef = session ?? null;
}

export function addOAuthDid(did: string, setActive = true): void {
  const store = getOAuthAccounts();
  if (!store.dids.includes(did)) store.dids = [...store.dids, did];
  if (setActive) store.activeDid = did;
  saveOAuthAccounts(store);
}

export function removeOAuthDid(did: string): void {
  const store = getOAuthAccounts();
  store.dids = store.dids.filter((d) => d !== did);
  if (store.activeDid === did) store.activeDid = store.dids[0] ?? null;
  saveOAuthAccounts(store);
}

export function setActiveOAuthDid(did: string | null): void {
  const store = getOAuthAccounts();
  store.activeDid = did;
  saveOAuthAccounts(store);
}

export function getOAuthAccountsSnapshot(): OAuthAccountsStore {
  return getOAuthAccounts();
}

export function getAccountProfiles(): Record<string, AccountProfile> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ACCOUNT_PROFILES_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAccountProfile(profile: AccountProfile): void {
  try {
    const profiles = getAccountProfiles();
    profiles[profile.did] = profile;
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACCOUNT_PROFILES_KEY, JSON.stringify(profiles));
  } catch { /* ignore */ }
}

export function removeAccountProfile(did: string): void {
  try {
    const profiles = getAccountProfiles();
    delete profiles[did];
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACCOUNT_PROFILES_KEY, JSON.stringify(profiles));
  } catch { /* ignore */ }
}

export function getStoredSession(): AtpSessionData | null {
  const accounts = getAccounts();
  if (accounts.activeDid) return accounts.sessions[accounts.activeDid] ?? null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (raw) return JSON.parse(raw) as AtpSessionData;
  } catch { /* ignore */ }
  return null;
}

export function getSession(): AtpSessionData | null {
  const a = getAgent();
  const atp = a as AtpAgent;
  if (atp.session) return atp.session;
  if (a.did) return { did: a.did } as AtpSessionData;
  return null;
}

export function getSessionsList(): AtpSessionData[] {
  const oauth = getOAuthAccounts();
  if (oauth.dids.length > 0) return oauth.dids.map((did) => ({ did } as AtpSessionData));
  const accounts = getAccounts();
  if (Object.keys(accounts.sessions).length === 0) {
    const single = getStoredSession();
    return single ? [single] : [];
  }
  return Object.values(accounts.sessions);
}

export async function resumeSession(): Promise<boolean> {
  const session = getStoredSession();
  if (!session?.accessJwt) return false;
  try {
    await credentialAgent.resumeSession(session);
    return true;
  } catch {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    return false;
  }
}

export async function login(identifier: string, password: string) {
  setOAuthAgent(null, null);
  return credentialAgent.login({ identifier, password });
}

export async function logout(): Promise<void> {
  if (oauthAgentInstance && oauthSessionRef) {
    try { await oauthSessionRef.signOut(); } catch { /* ignore */ }
    setOAuthAgent(null, null);
  }
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export async function logoutAccount(did: string): Promise<string | null> {
  if (oauthAgentInstance && oauthAgentInstance.did === did && oauthSessionRef) {
    try { await oauthSessionRef.signOut(); } catch { /* ignore */ }
    setOAuthAgent(null, null);
  }
  removeOAuthDid(did);
  removeAccountProfile(did);
  const accounts = getAccounts();
  if (accounts.sessions[did]) {
    delete accounts.sessions[did];
    if (accounts.activeDid === did) {
      const remaining = Object.keys(accounts.sessions);
      accounts.activeDid = remaining[0] ?? null;
    }
    saveAccounts(accounts);
  }
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }

  const nextCredentialDid = accounts.activeDid;
  if (nextCredentialDid) {
    const nextSession = accounts.sessions[nextCredentialDid];
    if (nextSession?.accessJwt) {
      try {
        await credentialAgent.resumeSession(nextSession);
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession)); } catch { /* ignore */ }
      } catch { /* ignore */ }
    }
  }

  const oauthAccounts = getOAuthAccounts();
  return oauthAccounts.activeDid ?? accounts.activeDid ?? null;
}

export async function getTimeline(limit = 50, cursor?: string): Promise<{ feed: TimelineItem[]; cursor?: string }> {
  const res = await agent.getTimeline({ limit, cursor });
  return { feed: res.data.feed as TimelineItem[], cursor: res.data.cursor };
}

export async function getFeed(feedUri: string, limit = 50, cursor?: string): Promise<{ feed: TimelineItem[]; cursor?: string }> {
  const api = getSession() ? agent : publicAgent;
  const res = await api.app.bsky.feed.getFeed({ feed: feedUri, limit, cursor });
  return { feed: (res.data.feed ?? []) as TimelineItem[], cursor: res.data.cursor };
}

export async function getMixedFeed(
  entries: FeedMixEntry[],
  limit: number,
  cursors?: Record<string, string>,
  usePublic = false,
): Promise<{ feed: TimelineItem[]; cursors: Record<string, string> }> {
  const totalPercent = entries.reduce((s, e) => s + e.percent, 0);
  if (!entries.length || totalPercent <= 0) return { feed: [], cursors: {} };

  const api = usePublic ? publicAgent : agent;
  const fetchLimit = Math.max(limit, 50);
  const results = await Promise.all(
    entries.map(async (entry) => {
      const key = entry.source.kind === 'timeline' ? 'timeline' : (entry.source.uri ?? '');
      const cursor = cursors?.[key];
      try {
        if (entry.source.kind === 'timeline') {
          if (usePublic) return { key, feed: [] as TimelineItem[], nextCursor: undefined };
          const res = await agent.getTimeline({ limit: fetchLimit, cursor });
          return { key, feed: res.data.feed as TimelineItem[], nextCursor: res.data.cursor };
        }
        if (entry.source.uri) {
          const res = await api.app.bsky.feed.getFeed({ feed: entry.source.uri, limit: fetchLimit, cursor });
          return { key, feed: res.data.feed as TimelineItem[], nextCursor: res.data.cursor };
        }
      } catch { /* ignore */ }
      return { key, feed: [] as TimelineItem[], nextCursor: undefined };
    }),
  );

  const combined: TimelineItem[] = [];
  const seen = new Set<string>();
  results.forEach((r, i) => {
    const pct = entries[i]?.percent ?? 0;
    const take = Math.round((limit * pct) / totalPercent);
    for (let j = 0; j < take && j < r.feed.length; j++) {
      const item = r.feed[j];
      if (item?.post?.uri && !seen.has(item.post.uri)) {
        seen.add(item.post.uri);
        combined.push(item);
      }
    }
  });

  combined.sort((a, b) => {
    const ta = new Date((a.post.record as { createdAt?: string })?.createdAt ?? 0).getTime();
    const tb = new Date((b.post.record as { createdAt?: string })?.createdAt ?? 0).getTime();
    return tb - ta;
  });

  const nextCursors: Record<string, string> = {};
  results.forEach((r) => { if (r.nextCursor) nextCursors[r.key] = r.nextCursor; });
  return { feed: combined.slice(0, limit), cursors: nextCursors };
}

export function getPostMediaInfo(post: PostView): PostMediaInfo | null {
  const embed = post.embed as Record<string, unknown> | undefined;
  if (!embed) return null;
  const e = embed as {
    $type?: string;
    images?: Array<{ thumb: string; fullsize: string; aspectRatio?: { width: number; height: number } }>;
    thumbnail?: string;
    playlist?: string;
    media?: Record<string, unknown>;
  };
  if (e.$type === 'app.bsky.embed.images#view' && e.images?.length) {
    const img = e.images[0];
    const ar = img.aspectRatio?.width && img.aspectRatio?.height ? img.aspectRatio.width / img.aspectRatio.height : undefined;
    return { url: img.fullsize ?? img.thumb, type: 'image', imageCount: e.images.length, aspectRatio: ar };
  }
  if (e.$type === 'app.bsky.embed.video#view') {
    return { url: (e.thumbnail as string) ?? '', type: 'video', videoPlaylist: e.playlist };
  }
  const media = e.media as typeof e | undefined;
  if (media?.$type === 'app.bsky.embed.images#view' && (media.images as unknown[])?.length) {
    const imgs = media.images as Array<{ fullsize?: string; thumb?: string; aspectRatio?: { width: number; height: number } }>;
    const img = imgs[0];
    const ar = img.aspectRatio?.width && img.aspectRatio?.height ? img.aspectRatio.width / img.aspectRatio.height : undefined;
    return { url: img.fullsize ?? img.thumb ?? '', type: 'image', imageCount: imgs.length, aspectRatio: ar };
  }
  if (media?.$type === 'app.bsky.embed.video#view') {
    return { url: (media.thumbnail as string) ?? '', type: 'video', videoPlaylist: media.playlist as string };
  }
  return null;
}

export function isPostNsfw(post: PostView): boolean {
  const nsfwVals = new Set(['porn', 'sexual', 'nudity', 'graphic-media']);
  const selfLabels = (post.record as { labels?: { values?: Array<{ val: string }> } })?.labels?.values;
  if (selfLabels?.some((v) => nsfwVals.has(v.val))) return true;
  return !!post.labels?.some((l) => nsfwVals.has(l.val));
}

export async function createPost(text: string, imageFiles?: File[], altTexts?: string[]): Promise<{ uri: string; cid: string }> {
  const t = text.trim();
  const images = (imageFiles ?? []).slice(0, 4);
  if (!t && !images.length) throw new Error('Post text or image required');

  let embed: Record<string, unknown> | undefined;
  if (images.length > 0) {
    const uploaded = await Promise.all(
      images.map(async (file, i) => {
        const { data } = await agent.uploadBlob(file, { encoding: file.type });
        return { image: data.blob, alt: (altTexts?.[i] ?? '').slice(0, 1000) };
      }),
    );
    embed = { $type: 'app.bsky.embed.images', images: uploaded };
  }
  const rt = new RichText({ text: t || '' });
  await rt.detectFacets(agent);
  const res = await agent.post({
    text: rt.text, facets: rt.facets, embed: embed as typeof embed & { $type: string },
    createdAt: new Date().toISOString(),
  });
  return { uri: res.uri, cid: res.cid };
}

export async function postReply(
  rootUri: string, rootCid: string, parentUri: string, parentCid: string,
  text: string, imageFiles?: File[],
): Promise<{ uri: string; cid: string }> {
  const t = text.trim();
  const images = (imageFiles ?? []).slice(0, 4);
  if (!t && !images.length) throw new Error('Reply text or image required');

  let embed: Record<string, unknown> | undefined;
  if (images.length > 0) {
    const uploaded = await Promise.all(
      images.map(async (file) => {
        const { data } = await agent.uploadBlob(file, { encoding: file.type });
        return { image: data.blob, alt: '' };
      }),
    );
    embed = { $type: 'app.bsky.embed.images', images: uploaded };
  }
  const rt = new RichText({ text: t || '' });
  await rt.detectFacets(agent);
  const res = await agent.post({
    text: rt.text, facets: rt.facets, embed: embed as typeof embed & { $type: string },
    createdAt: new Date().toISOString(),
    reply: { root: { uri: rootUri, cid: rootCid }, parent: { uri: parentUri, cid: parentCid } },
  });
  return { uri: res.uri, cid: res.cid };
}

export async function deletePost(uri: string): Promise<void> {
  const session = getSession();
  if (!session?.did) throw new Error('Not logged in');
  const parsed = parseAtUri(uri);
  if (!parsed) throw new Error('Invalid URI');
  await agent.com.atproto.repo.deleteRecord({
    repo: session.did, collection: 'app.bsky.feed.post', rkey: parsed.rkey,
  });
}

export async function createDownvote(subjectUri: string, subjectCid: string): Promise<string> {
  const session = getSession();
  if (!session?.did) throw new Error('Not logged in');
  const res = await agent.com.atproto.repo.createRecord({
    repo: session.did, collection: DOWNVOTE_COLLECTION,
    record: {
      $type: DOWNVOTE_COLLECTION,
      subject: { uri: subjectUri, cid: subjectCid },
      createdAt: new Date().toISOString(),
    },
  });
  return res.data.uri;
}

export async function deleteDownvote(downvoteUri: string): Promise<void> {
  const session = getSession();
  if (!session?.did) throw new Error('Not logged in');
  const parsed = parseAtUri(downvoteUri);
  if (!parsed) throw new Error('Invalid URI');
  await agent.com.atproto.repo.deleteRecord({
    repo: session.did, collection: DOWNVOTE_COLLECTION, rkey: parsed.rkey,
  });
}

export async function listMyDownvotes(): Promise<Record<string, string>> {
  const session = getSession();
  if (!session?.did) return {};
  const out: Record<string, string> = {};
  let cursor: string | undefined;
  do {
    const res = await agent.com.atproto.repo.listRecords({
      repo: session.did, collection: DOWNVOTE_COLLECTION, limit: 100, cursor,
    });
    for (const r of res.data.records ?? []) {
      const value = r.value as { subject?: { uri?: string } };
      if (value?.subject?.uri) out[value.subject.uri] = r.uri;
    }
    cursor = res.data.cursor;
  } while (cursor);
  return out;
}

export async function searchPostsByTag(tag: string, cursor?: string) {
  const normalized = tag.replace(/^#/, '').trim();
  if (!normalized) return { posts: [] as PostView[], cursor: undefined };
  const api = getSession() ? agent : publicAgent;
  const res = await api.app.bsky.feed.searchPosts({
    q: normalized, tag: [normalized], limit: 30, sort: 'latest', cursor,
  });
  return { posts: (res.data.posts ?? []) as PostView[], cursor: res.data.cursor };
}

export async function searchPostsByQuery(q: string, cursor?: string) {
  const term = q.trim();
  if (!term) return { posts: [] as PostView[], cursor: undefined };
  const api = getSession() ? agent : publicAgent;
  const res = await api.app.bsky.feed.searchPosts({
    q: term, limit: 30, sort: 'latest', cursor,
  });
  return { posts: (res.data.posts ?? []) as PostView[], cursor: res.data.cursor };
}

export async function searchActorsTypeahead(q: string, limit = 10) {
  const term = q.trim();
  if (!term) return { actors: [] };
  const api = getSession() ? agent : publicAgent;
  const res = await api.app.bsky.actor.searchActorsTypeahead({ q: term, limit });
  return res.data;
}

export type SuggestedFollow = { did: string; handle: string; displayName?: string; avatar?: string; count: number };

export async function getSuggestedFollows(currentUserDid: string, maxSuggestions = 15): Promise<SuggestedFollow[]> {
  const client = getAgent() as AtpAgent;
  const followRes = await client.app.bsky.graph.getFollows({ actor: currentUserDid, limit: 80 });
  const myFollows = (followRes.data.follows ?? []).map((f: { did: string }) => f.did);
  const myFollowSet = new Set([...myFollows, currentUserDid]);
  const sample = myFollows.length <= 20 ? myFollows : myFollows.sort(() => Math.random() - 0.5).slice(0, 20);
  const countByDid = new Map<string, number>();

  for (const did of sample) {
    try {
      const res = await client.app.bsky.graph.getFollows({ actor: did, limit: 50 });
      for (const f of res.data.follows ?? []) {
        if (!myFollowSet.has(f.did)) {
          countByDid.set(f.did, (countByDid.get(f.did) ?? 0) + 1);
        }
      }
    } catch { /* skip */ }
  }

  const sorted = [...countByDid.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxSuggestions);
  const results: SuggestedFollow[] = [];
  for (const [did, count] of sorted) {
    try {
      const profile = await client.getProfile({ actor: did });
      const d = profile.data as { handle?: string; displayName?: string; avatar?: string };
      results.push({ did, handle: d.handle ?? did, displayName: d.displayName, avatar: d.avatar, count });
    } catch {
      results.push({ did, handle: did, count });
    }
  }
  return results;
}

export async function followUser(did: string): Promise<string> {
  const session = getSession();
  if (!session?.did) throw new Error('Not logged in');
  const res = await agent.com.atproto.repo.createRecord({
    repo: session.did,
    collection: 'app.bsky.graph.follow',
    record: { $type: 'app.bsky.graph.follow', subject: did, createdAt: new Date().toISOString() },
  });
  return res.data.uri;
}

export async function unfollowUser(followUri: string): Promise<void> {
  const session = getSession();
  if (!session?.did) throw new Error('Not logged in');
  const parsed = parseAtUri(followUri);
  if (!parsed) throw new Error('Invalid follow URI');
  await agent.com.atproto.repo.deleteRecord({
    repo: session.did, collection: 'app.bsky.graph.follow', rkey: parsed.rkey,
  });
}

export type SavedFeedItem = { id: string; type: string; value: string; pinned: boolean };

export async function getSavedFeeds(): Promise<SavedFeedItem[]> {
  const prefs = await agent.getPreferences();
  return (prefs as { savedFeeds?: SavedFeedItem[] }).savedFeeds ?? [];
}

export async function addSavedFeeds(feeds: Array<{ type: 'feed' | 'timeline'; value: string; pinned?: boolean }>): Promise<void> {
  const a = getAgent() as { addSavedFeeds?: (arg: Array<{ type: string; value: string; pinned?: boolean }>) => Promise<unknown> };
  if (typeof a.addSavedFeeds !== 'function') throw new Error('addSavedFeeds not available');
  await a.addSavedFeeds(feeds.map((f) => ({ type: f.type, value: f.value, pinned: f.pinned ?? false })));
}

export async function removeSavedFeeds(ids: string[]): Promise<void> {
  const a = getAgent() as { removeSavedFeeds?: (ids: string[]) => Promise<unknown> };
  if (typeof a.removeSavedFeeds !== 'function') throw new Error('removeSavedFeeds not available');
  await a.removeSavedFeeds(ids);
}

export async function getSuggestedFeeds(limit = 20, cursor?: string): Promise<{ feeds: Array<{ uri: string; displayName?: string; description?: string }>; cursor?: string }> {
  const res = await agent.app.bsky.feed.getSuggestedFeeds({ limit, cursor });
  const feeds = (res.data.feeds ?? []).map((f: { uri: string; displayName?: string; description?: string }) => ({
    uri: f.uri, displayName: f.displayName, description: f.description,
  }));
  return { feeds, cursor: res.data.cursor };
}

export function parseAtUri(uri: string): { did: string; collection: string; rkey: string } | null {
  if (!uri.startsWith('at://')) return null;
  const parts = uri.slice(5).split('/');
  if (parts.length < 3) return null;
  return { did: parts[0], collection: parts[1], rkey: parts.slice(2).join('/') };
}

/** Fetch a single post thread (post + replies). Works unauthenticated. */
export async function getPostThread(uri: string, depth = 6) {
  const api = getSession() ? agent : publicAgent;
  const res = await api.getPostThread({ uri, depth });
  return res.data;
}

/** Fetch author feed (posts by a user). Works unauthenticated. */
export async function getAuthorFeed(
  actor: string,
  limit = 30,
  cursor?: string,
  filter?: 'posts_with_replies' | 'posts_no_replies' | 'posts_with_media' | 'posts_and_author_threads'
) {
  const api = getSession() ? agent : publicAgent;
  const res = await api.getAuthorFeed({ actor, limit, cursor, filter: filter ?? 'posts_no_replies' });
  return { feed: (res.data.feed ?? []) as TimelineItem[], cursor: res.data.cursor };
}

/** Like a post. Requires auth. */
export async function likePost(uri: string, cid: string) {
  const session = getSession();
  if (!session?.did) throw new Error('Not logged in');
  const res = await agent.like(uri, cid);
  return res;
}

/** Remove a like. Requires auth. */
export async function removeLike(likeUri: string) {
  await agent.deleteLike(likeUri);
}

/** Repost a post. Requires auth. */
export async function repostPost(uri: string, cid: string) {
  const session = getSession();
  if (!session?.did) throw new Error('Not logged in');
  const res = await agent.repost(uri, cid);
  return res;
}
