import Post from '../../models/post.model';
import { updatePost } from './update';
import debug from './debug';

async function updateRewards(startDate: Date, endDate: Date, limit?: number) {
  const aggregateQuery: any[] = [
    aggregateMatch(startDate, endDate),
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
      sort_by = 'contributions', // 'contributions' or 'rewards'
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

    if (include_rewards) {
      await updateRewards(start_date, end_date,
                          sort_by === 'contributions' ? limit : undefined);
    }

    const aggregateQuery: any[] = [
      aggregateMatch(start_date, end_date),
      ...aggregateGroup(include_rewards ? {
        total_pending_rewards: '$total_pending_payout_value',
        total_payout_value: '$total_payout_value'
      } : undefined)
    ];
    if (sort_by === 'contributions') {
      aggregateQuery.push({
        $limit: limit
      });
    }

    const data = await Post.aggregate(aggregateQuery);
    if (include_rewards) {
      // Aggregate the rewards
      for (const repo of data) {
        let rewards = 0;
        for (const post of repo['posts']) {
          const pending = parseFloat(post.total_pending_rewards.split(' ')[0]);
          const paid = parseFloat(post.total_payout_value.split(' ')[0]);
          rewards += pending + paid;
        }
        repo['rewards'] = rewards;
        repo['posts'] = undefined;
      }
      if (sort_by === 'rewards') {
        data.sort((a: any, b: any) => b.rewards - a.rewards);
      }
    }

    data.length = limit;
    return res.json(data);
  } catch (e) {
    next(e);
  }
}

function aggregateMatch(startDate: Date, endDate: Date) {
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

function aggregateGroup(addToSet?: any) {
  let group: any = {
    _id: '$json_metadata.repository.full_name',
    count: {$sum: 1},
  };

  if (addToSet) {
    group = {
      ...group,
      posts: {
        $addToSet: addToSet
      }
    };
  }
  return [
    { $group: group },
    { $sort: { count: -1 } }
  ];
}

function getBoolean(val?: string|boolean): boolean {
  return val === true || val === 'true';
}
