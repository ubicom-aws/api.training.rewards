import * as HttpStatus from 'http-status';
import APIError from '../helpers/APIError';
import * as request from 'superagent';
import Post from '../models/post.model';
import User from '../models/user.model';
import steemAPI from '../steemAPI';

function get(req, res, next) {
  Post.get(req.params.author, req.params.permlink)
    .then((post) => {
      res.json(post);
    })
    .catch(e => next(e));
}

function create(req, res, next) {
  if (res.locals.user.banned) {
    return res.status(HttpStatus.FORBIDDEN);
  }
  const author = req.body.author;
  const permlink = req.body.permlink;
  let attempts = 0;

  const doCreate = () => {
    steemAPI.getContent(author, permlink, async (err, post) => {
      if (err || !author || !permlink) {
        if (++attempts > 10) {
          console.log('ERROR GETTING CONTENT', err);
          return res.status(500);
        }
        setTimeout(() => {
          doCreate();
        }, attempts * 1000);
        return;
      }
      // hard fix for edge cases where json_metadata is empty
      const parsedJson = post.json_metadata && post.json_metadata !== '' ?
          JSON.parse(post.json_metadata) :
          {};

      const newPost = new Post({
        ...post,
        reviewed: false,
        json_metadata: parsedJson,
      });

      try {
        const dbPost = await Post.get(author, permlink);
        if (dbPost) {
          return res.json(dbPost);
        }
      } catch (e) {
        if (!(e instanceof APIError && e.status === HttpStatus.NOT_FOUND)) {
          return next(e);
        }
      }

      newPost.save()
          .then(savedPost => res.json(savedPost))
          .catch(e => {
            console.log("ERROR SAVING POST", e);
            next(e);
          });
    });
  };
  doCreate();
}

async function update(req, res, next) {
  const author = req.params.author;
  const permlink = req.params.permlink;
  const flagged = getBoolean(req.body.flagged);
  const pending = getBoolean(req.body.pending);
  const reviewed = getBoolean(req.body.reviewed);
  const moderator = req.body.moderator || null;
  const uprefix = req.body.uprefix || null;

  try {
    const post = await Post.get(author, permlink);
    const updatedPost: any = await new Promise((resolve, reject) => {
      steemAPI.getContent(author, permlink, (e, p) => {
        if (e) {
          return reject(e);
        }
        resolve(p);
      })
    });

    updatedPost.json_metadata = updatedPost.json_metadata && updatedPost.json_metadata !== '' ?
                                  JSON.parse(updatedPost.json_metadata) : {};

    // @UTOPIAN @TODO bad patches. Needs to have a specific place where the put the utopian data so it does not get overwritten
    if (!updatedPost.json_metadata.type && post.json_metadata.type) {
      updatedPost.json_metadata.type = post.json_metadata.type;
    }
    if (updatedPost.json_metadata.app !== 'utopian/1.0.0') updatedPost.json_metadata.app = 'utopian/1.0.0';
    if (updatedPost.json_metadata.community !== 'utopian') updatedPost.json_metadata.community = 'utopian';
    if (uprefix && uprefix !== null) updatedPost.json_metadata.uprefix = uprefix;
    // making sure the repository does not get deleted
    if (!updatedPost.json_metadata.repository) updatedPost.json_metadata.repository = post.json_metadata.repository;
    if (!updatedPost.json_metadata.platform) updatedPost.json_metadata.platform = post.json_metadata.platform;
    if (!updatedPost.json_metadata.pullRequests && post.json_metadata.pullRequests) updatedPost.json_metadata.pullRequests = post.json_metadata.pullRequests;
    if (!updatedPost.json_metadata.issue && post.json_metadata.issue) updatedPost.json_metadata.issue = post.json_metadata.issue;

    updatedPost.json_metadata.type = updatedPost.json_metadata.type.replace("announcement-", "task-");

    if (moderator) {
      post.moderator = moderator;
    }
    if (uprefix && uprefix !== null) {
      post.uprefix = uprefix;
    }

    if (reviewed) {
      post.reviewed = true;
      post.pending = false;
      post.flagged = false;

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
      post.flagged = true;
      post.reviewed = false;
      post.pending = false;
    } else if (pending) {
      post.pending = true;
      post.reviewed = false;
      post.flagged = false;
    }

    for (var prop in updatedPost) {
      if (updatedPost[prop] !== post[prop]) {
        post[prop] = updatedPost[prop];
      }
    }

    try {
      const savedPost = await post.save();
      res.json(savedPost);
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
    .then(post => res.json({
      ...post
    }))
    .catch(e => next(e));
}

async function addPostPrefix (req, res, next) {
  const { postId, uprefix } = req.body;
  try {
    const query = {
      'id': postId,
    };
    Post.list({ limit: 1, skip: 0, query})
    .then(post => {
      if (uprefix && uprefix !== null) post.uprefix = uprefix;
      post.save()
      .then(savedPost => res.json(savedPost))
      .catch(e => {
        console.log("ERROR SAVING POST WITH UPDATED UPREFIX", e);
        next(e);
      });
    })
    .catch(e => next(e));
  } catch (e) {
    console.log("ERROR UPDATING UPREFIX", e);
    next(e);
  }
}

function getPostById (req, res, next) {
  const { postId } = req.params;
  console.log(postId);

  if (postId === parseInt(postId, 10) || !isNaN(postId)) {
      const query = {
        'id': postId,
      };

      Post.list({ limit: 1, skip: 0, query })
      .then(post => {
        res.json({
        url: post[0].url,
        });
      })
      .catch(e => next(e));
  } else {
      const query = {
        'json_metadata.uprefix': postId.toLowerCase(),
      };

      Post.list({ limit: 1, skip: 0, query })
      .then(post => {
        res.json({
        url: post[0].url,
        });
      })
      .catch(e => next(e));

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
    flagged: {
      $ne : true,
    },
  };

  if (section !== 'author') {
    query = {
      ...query,
      reviewed: true,
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
      reviewed: false,
      moderator: {
        $ne: moderator,
      }
    }
    sort = { created: 1 }
  }

  if (status === 'pending') {
    query = {
      ...query,
      pending: true,
      moderator,
    }
  }

  if (status === 'flagged') {
    query = {
      ...query,
      flagged: true,
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
        .then(posts => res.json({
          total: count,
          results: posts
        }))
        .catch(e => next(e));

    })
    .catch(e => next(e));
}

function remove(req, res, next) {
  const post = req.post;
  post.remove()
    .then(deletedPost => res.json(deletedPost))
    .catch(e => next(e));
}

function getBoolean(val?: string|boolean): boolean {
  return val === true || val === 'true';
}

export default { get, create, update, list, getPostById, listByIssue, addPostPrefix, remove };
