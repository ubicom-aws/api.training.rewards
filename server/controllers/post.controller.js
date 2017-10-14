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
  const reviewed = req.body.reviewed || false;

  Post.get(req.params.author, req.params.permlink)
    .then((post) => {
      steemAPI.getContent(author, permlink, (err, updatedPost) => {
        if (!err) {

          updatedPost.json_metadata = JSON.parse(updatedPost.json_metadata);

          // @UTOPIAN backward compatibility with older posts without type
          if (!updatedPost.json_metadata.type && post.json_metadata.type) {
            updatedPost.json_metadata.type = post.json_metadata.type;
          }

          // making sure the post stays verified or gets verified on update
          if (reviewed) {
            post.reviewed = true;
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
    filterBy: active | review | any
   */
  const { limit, skip, section = 'all', type = 'all', sortBy = 'created', filterBy = 'any', projectId = null, platform = null, author = null } = req.query;
  const activeSince = new Date((new Date().getTime() - (7 * 24 * 60 * 60 * 1000)));
  let sort = { created: -1 };
  let query = {
    reviewed: true,
  };

  if (filterBy === 'review') {
    sort = { created : 1 };
  }

  if (sortBy === 'votes') {
    sort = { net_votes : -1 };
  }

  if (filterBy === 'review') {
    query = {
      ...query,
      reviewed: false,
      created:
        {
          $gte: activeSince.toISOString()
        },
    }
  }

  if (filterBy === 'active') {
    query = {
      ...query,
      created:
        {
          $gte: activeSince.toISOString()
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
