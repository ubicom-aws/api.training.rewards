import Post from '../../models/post.model';
import { updatePost } from './update';
import debug from './debug';

async function updateRewards(startDate: Date, endDate: Date, limit: number) {
  const data = await Post.aggregate([
    basicMatch(startDate, endDate),
    {
      $match: {
        cashout_time: {
          $ne: "1969-12-31T23:59:59"
        }
      }
    },
    {
      $group: {
        _id: '$json_metadata.repository.full_name',
        posts: {
          $addToSet: {
            author: '$author',
            permlink: '$permlink'
          }
        }
      }
    },
    {
      $limit: limit
    }
  ]);
  for (const repo of data) {
    for (const post of repo['posts']) {
      const author = post.author;
      const permlink = post.permlink;
      try {
        debug('Updating post %s/%s', author, permlink);
        await updatePost(author, permlink);
      } catch (e) {
        console.log('Failed to update post', e);
      }
    }
  }
}

export async function top(req, res, next) {
  try {
    let {
      limit = 5,
      start_date = new Date(0),
      end_date = new Date(),
      include_rewards = false
    } = req.query;

    if (typeof(start_date) === 'string') {
      start_date = new Date(start_date);
    }
    if (typeof(end_date) === 'string') {
      end_date = new Date(end_date);
    }
    limit = parseInt(limit);
    include_rewards = getBoolean(include_rewards);

    if (include_rewards) await updateRewards(start_date, end_date, limit);
    const data = await Post.aggregate([
      basicMatch(start_date, end_date),
      basicGroup(include_rewards),
      {
        $sort: {
          count: -1
        }
      },
      {
        $limit: limit
      }
    ]);

    if (include_rewards) {
      // Aggregate the rewards
      for (const repo of data) {
        let rewards = 0;
        for (const post of repo['posts']) {
          const pending = parseFloat(post.total_pending_rewards.split(' ')[0]);
          const paid = parseFloat(post.total_payout_value.split(' ')[0]);
          rewards += pending + paid;
        }
        repo['rewards'] = rewards.toFixed(3) + ' SBD';
        repo['posts'] = undefined;
      }
    }

    return res.json(data);
  } catch (e) {
    next(e);
  }
}

function basicMatch(startDate: Date, endDate: Date) {
  return {
    $match: {
      'json_metadata.repository.full_name': {$ne: null},
      'created': {
        $gte: startDate.toISOString(),
        $lt: endDate.toISOString()
      },
      'flagged': false
    }
  };
}

function basicGroup(includeRewards: boolean) {
  let group: any = {
    _id: '$json_metadata.repository.full_name',
    count: {$sum: 1},
  };

  if (includeRewards) {
    group = {
      ...group,
      posts: {
        $addToSet: {
          total_pending_rewards: '$total_pending_payout_value',
          total_payout_value: '$total_payout_value'
        }
      }
    };
  }
  return {
    $group: group
  };
}

function getBoolean(val?: string|boolean): boolean {
  return val === true || val === 'true';
}
