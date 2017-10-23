import Post from '../models/post.model';
import steemAPI from '../steemAPI';

function get(req, res, next) {
  Post.get(req.params.author, req.params.permlink)
    .then((post) => {
      res.json(post);
    })
    .catch(e => next(e));
}

function create(req, res, next) {
  const author = req.body.author;
  const permlink = req.body.permlink;

  steemAPI.getContent(author, permlink, (err, post) => {
    if (!err) {
      const newPost = new Post({
        ...post,
        reviewed: false,
        json_metadata: JSON.parse(post.json_metadata)
      });

      newPost.save()
        .then(savedPost => res.json(savedPost))
        .catch(e => {
          console.log("ERROR SAVING POST", e);
          next(e);
        });
    }
  });
}

function update(req, res, next) {
  const author = req.body.author;
  const permlink = req.body.permlink;
  const flagged = req.body.flagged || false;
  const pending = req.body.pending || false;
  const reviewed = req.body.reviewed || false;
  const moderator = req.body.moderator || null;

  Post.get(req.params.author, req.params.permlink)
    .then((post) => {
      steemAPI.getContent(author, permlink, (err, updatedPost) => {
        if (!err) {

          updatedPost.json_metadata = JSON.parse(updatedPost.json_metadata);

          // @UTOPIAN @TODO bad patches. Needs to have a specific place where the put the utopian data so it does not get overwritten
          if (!updatedPost.json_metadata.type && post.json_metadata.type) {
            updatedPost.json_metadata.type = post.json_metadata.type;
          }
          if (updatedPost.json_metadata.app !== 'utopian/1.0.0') updatedPost.json_metadata.app = 'utopian/1.0.0';
          if (updatedPost.json_metadata.community !== 'utopian') updatedPost.json_metadata.community = 'utopian';
          // making sure the repository does not get deleted
          if (!updatedPost.json_metadata.repository) updatedPost.json_metadata.repository = post.json_metadata.repository;
          if (!updatedPost.json_metadata.platform) updatedPost.json_metadata.platform = post.json_metadata.platform;

          if (reviewed) {
            post.reviewed = true;
          }

          if (flagged) {
            post.flagged = true;
          }

          if (pending) {
            post.pending = true;
          }

          if (moderator) {
            post.moderator = moderator;
          }

          for (var prop in updatedPost) {
            if (updatedPost[prop] !== post[prop]) {
              post[prop] = updatedPost[prop];
            }
          }

          post.save()
            .then(savedPost => res.json(savedPost))
            .catch(e => {
              console.log("ERROR UPDATING POST", e);
              next(e);
            });
        }
      });
    })
    .catch(e => next(e));
}

function list(req, res, next) {
  /*
    section : author | project | all
    type: ideas | code | graphics | social | all
    sortBy: created | votes | reward
    filterBy: active | review | any,
    status: pending | flagged | any
   */
  const { limit, skip, section = 'all', type = 'all', sortBy = 'created', filterBy = 'any', status = 'any', projectId = null, platform = null, author = null, moderator = 'any' } = req.query;
  const cashoutTime = '1969-12-31T23:59:59';

  let sort = { created: -1 };
  let query = {
    reviewed: true,
    flagged: {
      $ne : true,
    },
  };

  if (sortBy === 'votes') {
    sort = { net_votes : -1 };
  }

  if (filterBy === 'review') {
    query = {
      ...query,
      reviewed: false,
      pending: {
        $ne : true,
      },
    }
  }

  if (status === 'pending') {
    query = {
      ...query,
      pending: true,
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
    query = {
      ...query,
      'json_metadata.type': type,
    };
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

  if (moderator && moderator !== 'any') {
    query = {
      ...query,
      moderator,
    };
  }

  Post.countAll({ query })
    .then(count => {
      Post.list({ limit, skip, query, sort })
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

export default { get, create, update, list, remove };
