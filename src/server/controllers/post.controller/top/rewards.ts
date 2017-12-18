import { aggregateMatch, aggregateGroup } from './aggregate';
import Post from '../../../models/post.model';
import { getUpdatedPost } from '../update';
import debug from '../debug';

export async function updateRewards(startDate: Date,
                                    endDate: Date,
                                    limit?: number) {
  const aggregateQuery: any[] = [
    aggregateMatch(startDate, endDate),
    {
      $match: {
        cashout_time: { $ne: '1969-12-31T23:59:59' }
      }
    },
    ...aggregateGroup({
      author: '$author',
      permlink: '$permlink'
    })
  ];

  if (limit) {
    aggregateQuery.push({
      $limit: limit
    });
  }

  const data = await Post.aggregate(aggregateQuery);
  if (debug.enabled) {
    let count = 0;
    for (const repo of data) {
      for (const post of repo['posts']) count++;
    }
    debug('%d posts need to be updated', count);
  }

  for (const repo of data) {
    const posts: any[] = repo['posts'];
    for (let i = 0; i < posts.length;) {
      const proms: Promise<any>[] = [];
      for (let x = 0; x < 5; ++x) {
        if (x + i >= posts.length) {
          break;
        }
        const post = posts[i++];
        const author = post.author;
        const permlink = post.permlink;
        debug('Updating post %s/%s', author, permlink);
        proms.push(getUpdatedPost(author, permlink));
      }
      try {
        const completed = await Promise.all(proms);
        for (const c of completed) {
          c.save();
        }
      } catch (e) {
        console.log('Failed to update posts', e);
      }
    }
  }
}
