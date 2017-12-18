import { aggregateMatch, aggregateGroup } from './aggregate';
import { RateLimit } from '../../../routes/middleware';
import Post from '../../../models/post.model';
import { getUpdatedPost } from '../update';
import * as HttpStatus from 'http-status';
import { updateRewards } from './rewards';
import * as crypto from 'crypto';
import debug from '../debug';

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
  only_new: boolean;
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
    include_rewards = false,
    only_new = false
  } = req.query;

  try {
    if (typeof(start_date) === 'string') start_date = new Date(start_date);
    if (typeof(end_date) === 'string') end_date = new Date(end_date);
    limit = Number(limit);
    include_rewards = getBoolean(include_rewards);
    only_new = getBoolean(only_new);

    if (isNaN(limit) || limit > 100) {
      res.json({
        error: 'limit is invalid or too high'
      });
      return true;
    } else if (include_rewards
        && end_date.getTime() - start_date.getTime() > 8 * 24 * 60 * 60 * 1000) {
      res.json({
        error: 'date range with rewards included must be less than 8 days apart'
      });
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
    include_rewards,
    only_new
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

  if (!include_rewards) {
    next();
    return true;
  }
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
      aggregateMatch(params.only_new ? undefined : params.start_date, params.end_date),
      ...aggregateGroup(params.include_rewards ? {
        total_pending_rewards: '$total_pending_payout_value',
        total_payout_value: '$total_payout_value'
      } : undefined)
    ];

    const data: any[] = await Post.aggregate(aggregateQuery);
    if (params.only_new || params.include_rewards) {
      for (let i = data.length - 1; i >= 0; --i) {
        const repo = data[i];
        let blacklist = false;
        let rewards = 0;
        for (const post of repo['posts']) {
          if (params.only_new
              && (new Date(post.created).getTime())
                    < params.start_date.getTime()) {
            blacklist = true;
            break;
          }
          if (params.include_rewards) {
            const pending = parseFloat(post.total_pending_rewards.split(' ')[0]);
            const paid = parseFloat(post.total_payout_value.split(' ')[0]);
            rewards += pending + paid;
          }
        }
        if (blacklist) {
          data.splice(i, 1);
          continue;
        }
        if (params.include_rewards) {
          repo['rewards'] = rewards;
        }
        repo['posts'] = undefined;
      }

      if (params.include_rewards && params.sort_by === 'rewards') {
        data.sort((a: any, b: any) => b.rewards - a.rewards);
      }
    }

    if (data.length > params.limit) data.length = params.limit;
    cached.status = TaskStatus.SUCCESS;
    cached.statusMessage = TaskStatus[TaskStatus.SUCCESS];
    cached.results = data;
    setTimeout(() => {
      delete cached[params.cacheId];
    }, params.include_rewards ? 1000 * 60 * 60 * 12 : 1000 * 60 * 5);
  } catch (e) {
    console.log('Failed to retrieve top projects', e);
    cached.status = TaskStatus.ERROR;
    cached.statusMessage = e.message;
  }
}

function getBoolean(val?: string|boolean): boolean {
  return val === true || val === 'true';
}
