import { aggregateMatch, aggregateGroup } from './aggregate';
import { RateLimit } from '../../../routes/middleware';
import Post from '../../../models/post.model';
import { getUpdatedPost } from '../update';
import * as HttpStatus from 'http-status';
import { updateRewards } from './rewards';
import * as crypto from 'crypto';
import debug from '../debug';
import { setTimeout } from 'timers';

const cache: {[key: string]: TaskModel} = {};

export enum TaskStatus {
  ERROR = -1,
  SUCCESS = 0,
  IN_PROGRESS = 1
}

export interface TaskModel {
  status: TaskStatus;
  statusMessage: string;
  results?: any;
}

export enum TopSortBy {
  CONTRIBUTIONS = 'contributions',
  REWARDS = 'rewards'
}

export interface TopQueryParams {
  limit: number;
  start_date: Date;
  end_date: Date;
  sort_by: TopSortBy;
  include_rewards: boolean;
}

export interface CacheableQueryParams extends TopQueryParams {
  cacheId: string;
}

export function bypassRateLimit(req, res, next): boolean {
  let {
    limit = 5,
    start_date = new Date(0),
    end_date = new Date(),
    sort_by = 'contributions',
    include_rewards = false
  } = req.query;

  try {
    if (typeof(start_date) === 'string') start_date = new Date(start_date);
    if (typeof(end_date) === 'string') end_date = new Date(end_date);
    limit = Number(limit);
    include_rewards = getBoolean(include_rewards);

    if (isNaN(limit)) {
      res.json({
        error: 'limit is invalid or too high'
      });
      return true;
    }
  } catch (e) {
    next(e);
    return true;
  }

  const query: TopQueryParams = {
    limit,
    start_date,
    end_date,
    sort_by,
    include_rewards
  };

  const cryptoHash = crypto.createHash('md5');
  const buf = cryptoHash.update(JSON.stringify(query)).digest();
  const cacheId = buf.toString('hex');

  if (cache[cacheId]) {
    const cached = cache[cacheId];
    if (cached.status === TaskStatus.ERROR) {
      delete cache[cacheId];
    }
    res.json(cache[cacheId]);
    return true;
  }

  req.query = {
    cacheId,
    ...query
  };
  return false;
}

export async function top(req, res, next) {
  const params: CacheableQueryParams = req.query;
  const cached: TaskModel = cache[params.cacheId] = {
    status: TaskStatus.IN_PROGRESS,
    statusMessage: TaskStatus[TaskStatus.IN_PROGRESS]
  };
  res.json(cached);
  try {
    if (params.include_rewards) {
      const limiter = params.sort_by === 'contributions' ? params.limit : undefined;
      await updateRewards(params.start_date, params.end_date, limiter);
    }

    const aggregateQuery: any[] = [
      aggregateMatch(params.start_date, params.end_date),
      ...aggregateGroup(params.include_rewards ? {
        total_pending_rewards: '$total_pending_payout_value',
        total_payout_value: '$total_payout_value'
      } : undefined)
    ];
    if (params.sort_by === 'contributions') {
      aggregateQuery.push({
        $limit: params.limit
      });
    }

    const data = await Post.aggregate(aggregateQuery);
    if (params.include_rewards) {
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
      if (params.sort_by === 'rewards') {
        data.sort((a: any, b: any) => b.rewards - a.rewards);
      }
    }

    if (data.length > params.limit) data.length = params.limit;
    cached.status = TaskStatus.SUCCESS;
    cached.statusMessage = TaskStatus[TaskStatus.SUCCESS];
    cached.results = data;
    setTimeout(() => {
      delete cached[params.cacheId];
    }, 1000 * 60 * 60 * 12);
  } catch (e) {
    console.log('Failed to retrieve top projects', e);
    cached.status = TaskStatus.ERROR;
    cached.statusMessage = e.message;
  }
}

function getBoolean(val?: string|boolean): boolean {
  return val === true || val === 'true';
}
