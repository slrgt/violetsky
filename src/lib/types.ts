/**
 * Shared TypeScript types for VioletSky.
 */

export interface TimelineItem {
  post: PostView;
  reason?: { $type: string; by?: { did: string; handle?: string } };
  _feedSource?: FeedSource;
}

export interface PostView {
  uri: string;
  cid: string;
  author: ProfileView;
  record: Record<string, unknown>;
  embed?: Record<string, unknown>;
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  labels?: Array<{ val: string }>;
  viewer?: { like?: string; repost?: string };
  indexedAt?: string;
}

export interface ProfileView {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  viewer?: { following?: string; followedBy?: string; muted?: boolean; blockedBy?: boolean };
}

export type FeedKind = 'timeline' | 'custom';

export interface FeedSource {
  kind: FeedKind;
  label: string;
  uri?: string;
}

export interface FeedMixEntry {
  source: FeedSource;
  percent: number;
}

export interface PostMediaInfo {
  url: string;
  type: 'image' | 'video';
  imageCount?: number;
  videoPlaylist?: string;
  aspectRatio?: number;
}

export interface ArtboardPost {
  uri: string;
  cid: string;
  authorHandle?: string;
  text?: string;
  thumb?: string;
  thumbs?: string[];
}

export interface Artboard {
  id: string;
  name: string;
  posts: ArtboardPost[];
  createdAt: string;
}

export interface ForumPost {
  uri: string;
  cid: string;
  did: string;
  rkey: string;
  title?: string;
  body?: string;
  createdAt?: string;
  authorHandle?: string;
  authorAvatar?: string;
  tags?: string[];
  isPinned?: boolean;
  isWiki?: boolean;
  replyCount?: number;
  likeCount?: number;
}

export interface ForumReply {
  uri: string;
  cid: string;
  replyTo?: string;
  author: ProfileView;
  record: { text?: string; createdAt?: string; facets?: unknown[] };
  likeCount?: number;
  viewer?: { like?: string };
  isComment?: boolean;
}

export interface ConsensusStatement {
  id: string;
  text: string;
  authorDid: string;
  createdAt: string;
}

export interface ConsensusVote {
  userId: string;
  statementId: string;
  value: -1 | 0 | 1;
}

export interface ConsensusResult {
  statements: Array<{
    statementId: string;
    agreeCount: number;
    disagreeCount: number;
    passCount: number;
    totalVoters: number;
    agreementRatio: number;
    divisiveness: number;
  }>;
  totalParticipants: number;
  clusterCount: number;
  clusters: Array<{
    id: number;
    memberCount: number;
    memberIds: string[];
    avgAgreement: number;
  }>;
}

export type ProjectType = 'blender' | 'godot' | 'general';

export interface CollabProject {
  uri: string;
  name: string;
  description: string;
  type: ProjectType;
  owner: string;
  tags: string[];
  version: string;
  externalUrl?: string;
  magnetLink?: string;
  previewUrl?: string;
  createdAt: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface KanbanBoard {
  id: string;
  projectUri: string;
  columns: Array<{
    id: string;
    title: string;
    cards: KanbanCard[];
  }>;
}

export type ThemeMode = 'light' | 'dark' | 'system' | 'high-contrast';
export type ViewColumns = 1 | 2 | 3;
export type CardViewMode = 'full' | 'mini' | 'art';
