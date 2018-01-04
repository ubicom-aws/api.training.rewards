import APIError from '../../helpers/APIError';
import { top } from './top';
import Post from '../../models/post.model';
import User from '../../models/user.model';
import * as HttpStatus from 'http-status';
import { getUpdatedPost } from './update';
import * as request from 'superagent';
import steemAPI from '../../steemAPI';
import * as sc2 from '../../sc2';

function postMapper(post) {
  if (post.json_metadata.moderator) {
    // Enable backwards compatibility for the front end
    const mod = post.json_metadata.moderator;
    post.moderator = mod.account || undefined;
    post.pending = mod.pending || false;
    post.reviewed = mod.reviewed || false;
    post.flagged = mod.flagged || false;
  }
  return post;
}

function sendPost(res, post) {
  res.json(postMapper(post));
}

function get(req, res, next) {
  Post.get(req.params.author, req.params.permlink)
    .then(post => sendPost(res, post)).catch(e => next(e));
}

async function create(req, res, next) {
  if (res.locals.user.banned) {
    return res.status(HttpStatus.FORBIDDEN);
  }
  const author = req.body.author;
  const permlink = req.body.permlink;
  try {
    const dbPost = await Post.get(author, permlink);
    if (dbPost) {
      sendPost(res, dbPost);
    }
  } catch (e) {
    if (!(e instanceof APIError && e.status === HttpStatus.NOT_FOUND)) {
      return next(e);
    }
  }
}

async function update(req, res, next) {
  const author = req.params.author;
  const permlink = req.params.permlink;
  const flagged = getBoolean(req.body.flagged);
  const reserved = getBoolean(req.body.reserved);
  const moderator = req.body.moderator || null;
  const pending = getBoolean(req.body.pending);
  const reviewed = getBoolean(req.body.reviewed);

  try {
    const post = await getUpdatedPost(author, permlink);
    if (!post.json_metadata.moderator) {
      post.json_metadata.moderator = {};
    }

    if (moderator) post.json_metadata.moderator.account = moderator;
    if (reviewed) {
      post.json_metadata.moderator.reviewed = true;
      post.json_metadata.moderator.pending = false;
      post.json_metadata.moderator.flagged = false;

      if (post.json_metadata.type === 'bug-hunting') {
        try {
          const user = await User.get(post.author);
          if (user.github && user.github.account) {
            const resGithub = await request.post(`https://api.github.com/repos/${post.json_metadata.repository.full_name.toLowerCase()}/issues`)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Authorization', `token ${user.github.token}`)
                .send({
                  title: post.title,
                  body: post.body,
                });
            const issue = resGithub.body;
            const { html_url, number, id, title } = issue;

            post.json_metadata.issue = {
              url: html_url,
              number,
              id,
              title,
            };
          }
        } catch (e) {
          console.log("ERROR REVIEWING GITHUB", e);
        }
      }
    } else if (flagged) {
      post.json_metadata.moderator.flagged = true;
      post.json_metadata.moderator.reviewed = false;
      post.json_metadata.moderator.pending = false;
    } else if (pending) {
      post.json_metadata.moderator.pending = true;
      post.json_metadata.moderator.reviewed = false;
      post.json_metadata.moderator.flagged = false;
    } else if (reserved) {
      post.json_metadata.moderator.pending = false;
      post.json_metadata.moderator.reviewed = false;
      post.json_metadata.moderator.flagged = false;
    }

    try {
      try {
        const user = await User.get(post.author);
        await sc2.send('/broadcast', {
          user,
          data: {
            operations: [[
              'comment',
              {
                parent_author: post.parent_author,
                parent_permlink: post.parent_permlink,
                author: post.author,
                permlink: post.permlink,
                title: post.title,
                body: post.body,
                json_metadata: JSON.stringify(post.json_metadata),
              }
            ]]
          }
        });
      } catch (e) {
        console.log('FAILED TO UPDATE POST DURING REVIEW', e);
      }

      post.markModified('json_metadata.moderator');
      const savedPost = await post.save();
      sendPost(res, savedPost);
    } catch (e) {
      console.log("ERROR REVIEWING POST", e);
      next(e);
    }
  } catch (e) {
    next(e);
  }
}

function listByIssue (req, res, next) {
  const { id } = req.query;

  const query = {
    reviewed: true,
    flagged: {
      $ne : true,
    },
    'json_metadata.issue.id': id
  };

  Post.list({ limit: 1, skip: 0, query })
    .then(post => sendPost(res, post))
    .catch(e => next(e));
}

function getPostById (req, res, next) {
  const { postId } = req.params;
  console.log(postId);

  if (postId === parseInt(postId, 10) || !isNaN(postId)) {
    const query = {
      'id': postId,
    };

    Post.list({ limit: 1, skip: 0, query }).then(post => {
      res.json({
        url: post[0].url,
      });
    }).catch(e => next(e));
  }
}

function list(req, res, next) {
  /*
   section : author | project | all
   type: ideas | code | graphics | social | all
   sortBy: created | votes | reward
   filterBy: active | review | any,
   status: pending | flagged | any
   */
  const { limit, skip, section = 'all', type = 'all', sortBy = 'created', filterBy = 'any', status = 'any', projectId = null, platform = null, author = null, moderator = 'any', bySimilarity = null } = req.query;
  const cashoutTime = '1969-12-31T23:59:59';

  let sort: any = { created: -1 };
  let select: any = {}

  let query: any = {
    'json_metadata.moderator.flagged': {
      $ne : true,
    },
  };

  if (section !== 'author' && status !== 'flagged') {
    query = {
      ...query,
      'json_metadata.moderator.reviewed': true,
    }
  }

  if (bySimilarity) {
    select = {
      "score": {
        "$meta": "textScore"
      }
    }
    sort = {
      "score": {
        "$meta": "textScore"
      }
    }
    query = {
      ...query,
      $text: {
        $search: bySimilarity
        }
      },
      {
        score: {
          $meta: "textScore"
        }
      }
  }

  if (sortBy === 'votes') {
    sort = { net_votes : -1 };
  }

  if (filterBy === 'review') {
    query = {
      ...query,
      'json_metadata.moderator.reviewed': {$ne: true},
      'json_metadata.moderator.account': {
        $ne: moderator,
      }
    }
    sort = { created: 1 }
  }

  if (status === 'pending') {
    query = {
      ...query,
      'json_metadata.moderator.pending': true,
      moderator,
    }
  }

  if (status === 'flagged') {
    query = {
      ...query,
      'json_metadata.moderator.flagged': true,
    }
  }

  if (filterBy === 'active') {
    query = {
      ...query,
      cashout_time:
        {
          $gt: cashoutTime
        },
    };
  }

  if (filterBy === 'inactive') {
    query = {
      ...query,
      cashout_time:
        {
          $eq: cashoutTime
        },
    };
  }

  if (type !== 'all') {
    if (type !== 'tasks') {
      query = {
        ...query,
        'json_metadata.type': type,
      };
    } else {
      query = {
        ...query,
        'json_metadata.type': {
          $regex : (/task-/i)
        }
      };
    }
  }

  if (section === 'project') {
    query = {
      ...query,
      'json_metadata.repository.id': +projectId,
      'json_metadata.platform': platform,
    };
  }

  if (section === 'author') {
    query = {
      ...query,
      author
    };
  }

  Post.countAll({ query })
    .then(count => {
      Post.list({ limit, skip, query, sort, select })
        .then((posts: any[]) => res.json({
          total: count,
          results: posts.map(postMapper)
        }))
        .catch(e => next(e));

    })
    .catch(e => next(e));
}

function remove(req, res, next) {
  const post = req.post;
  post.remove()
    .then(deletedPost => sendPost(res, deletedPost))
    .catch(e => next(e));
}

function getBoolean(val?: string|boolean): boolean {
  return val === true || val === 'true';
}

export default {
  get,
  create,
  update,
  list,
  top,
  getPostById,
  listByIssue,
  remove
};
