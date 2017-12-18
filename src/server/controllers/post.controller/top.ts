import Post from '../../models/post.model';
import { getUpdatedPost } from './update';
import debug from './debug';

export async function top(req, res, next) {
  let socketOpen = true;
  res.socket.setKeepAlive(true, 5000);
  res.socket.on('close', () => {
    socketOpen = false;
  })
  res.writeHead(200, {
    'Content-Type': 'application/json'
  });

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
      const limiter = sort_by === 'contributions' ? limit : undefined;
      await updateRewards(start_date, end_date, limiter, () => {
        // Keep the connection alive
        if (socketOpen) res.write('\n');
        return socketOpen;
      });
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

    if (data.length > limit) data.length = limit;
    return res.end(JSON.stringify(data));
  } catch (e) {
    console.log('Failed to retrieve top projects', e);
    res.end();
  }
}

async function updateRewards(startDate: Date,
                              endDate: Date,
                              limit?: number,
                              onUpdate?: Function) {
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
  if (debug.enabled) {
    let count = 0;
    for (const repo of data) {
      for (const post of repo['posts']) count++;
    }
    debug('%d posts need to be updated', count);
  }

loop:
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
      if (onUpdate && !onUpdate()) {
        break loop;
      }
    }
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
