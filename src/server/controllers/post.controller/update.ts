import { getContent } from '../../steemAPI';
import Post from '../../models/post.model';

export async function getUpdatedPost(author: string, permlink: string) {
  const post = await Post.get(author, permlink);
  const updatedPost: any = await getContent(author, permlink);
  return handleUpdatedPost(post, updatedPost);
}

export function handleUpdatedPost(post: any, updatedPost: any): any {
  updatedPost.json_metadata = JSON.parse(updatedPost.json_metadata);

  if (!updatedPost.json_metadata.type && post.json_metadata.type) updatedPost.json_metadata.type = post.json_metadata.type;
  if (updatedPost.json_metadata.app !== 'utopian/1.0.0') updatedPost.json_metadata.app = 'utopian/1.0.0';
  if (updatedPost.json_metadata.community !== 'utopian') updatedPost.json_metadata.community = 'utopian';
  if (!updatedPost.json_metadata.repository) updatedPost.json_metadata.repository = post.json_metadata.repository;
  if (!updatedPost.json_metadata.platform) updatedPost.json_metadata.platform = post.json_metadata.platform;
  if (!updatedPost.json_metadata.pullRequests && post.json_metadata.pullRequests) updatedPost.json_metadata.pullRequests = post.json_metadata.pullRequests;
  if (!updatedPost.json_metadata.issue && post.json_metadata.issue) updatedPost.json_metadata.issue = post.json_metadata.issue;
  updatedPost.json_metadata.type = updatedPost.json_metadata.type.replace("announcement-", "task-");
  // Temporary upgrade patch
  if (post.json_metadata.moderator === undefined) {
    post.json_metadata.moderator = {
      account: post.moderator,
      reviewed: post.reviewed,
      pending: post.pending,
      flagged: post.flagged
    };
  } else if (post.moderator && post.json_metadata.moderator.account === undefined) {
    post.json_metadata.moderator.account = post.moderator;
  }
  updatedPost.json_metadata.moderator = post.json_metadata.moderator;

  Object.assign(post, updatedPost);
  return post;
}
