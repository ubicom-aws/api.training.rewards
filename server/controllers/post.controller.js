import Post from '../models/post.model';
const steem = require('steem');

function load(req, res, next, permlink) {
  Post.get(permlink)
    .then((post) => {
      req.post = post;
      return next();
    })
    .catch(e => next(e));
}

function get(req, res) {
  return res.json(req.post);
}

function create(req, res, next) {
  const author = req.body.author;
  const permlink = req.body.permlink;

  steem.api.getContent(author, permlink, (err, post) => {
    if (!err) {
      const newPost = new Post({
        ...post,
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
  const post = req.post;
  const author = req.body.author;
  const permlink = req.body.permlink;

  steem.api.getContent(author, permlink, (err, updatedPost) => {
    if (!err) {

      for (var prop in updatedPost) {
        if (updatedPost[prop] !== post[prop]) {
          post[prop] = updatedPost[prop]
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
}

function list(req, res, next) {
  const { limit, skip } = req.query;

  Post.countAll()
    .then(count => {
      Post.list({ limit, skip })
        .then(posts => res.json({
          total: count,
          results: posts
        }))
        .catch(e => next(e));
    })
    .catch(e => next(e));
}

function listActive (req, res, next) {
  const { limit, skip } = req.query;
  const query = {
    created:
      {
        $gte: new Date((new Date().getTime() - (7 * 24 * 60 * 60 * 1000)))
      }
  };

  Post.countAll({ query })
    .then(count => {
      Post.list({ limit, skip, query })
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

export default { load, get, create, update, updateActive, list, listActive, remove };
