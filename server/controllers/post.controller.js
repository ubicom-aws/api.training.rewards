import Post from '../models/post.model';
import User from '../models/user.model';
import steemAPI from '../steemAPI';
import request from 'superagent';

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
      // hard fix for edge cases where json_metadata is empty
      const parsedJson = post.json_metadata && post.json_metadata !== '' ?
        JSON.parse(post.json_metadata) :
        {};

      const newPost = new Post({
        ...post,
        reviewed: false,
        json_metadata: parsedJson,
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
          updatedPost.json_metadata = updatedPost.json_metadata && updatedPost.json_metadata !== '' ?
            JSON.parse(updatedPost.json_metadata) :
            {};

          // @UTOPIAN @TODO bad patches. Needs to have a specific place where the put the utopian data so it does not get overwritten
          if (!updatedPost.json_metadata.type && post.json_metadata.type) {
            updatedPost.json_metadata.type = post.json_metadata.type;
          }
          if (updatedPost.json_metadata.app !== 'utopian/1.0.0') updatedPost.json_metadata.app = 'utopian/1.0.0';
          if (updatedPost.json_metadata.community !== 'utopian') updatedPost.json_metadata.community = 'utopian';
          // making sure the repository does not get deleted
          if (!updatedPost.json_metadata.repository) updatedPost.json_metadata.repository = post.json_metadata.repository;
          if (!updatedPost.json_metadata.platform) updatedPost.json_metadata.platform = post.json_metadata.platform;
          if (!updatedPost.json_metadata.pullRequests && post.json_metadata.pullRequests) updatedPost.json_metadata.pullRequests = post.json_metadata.pullRequests;
          if (!updatedPost.json_metadata.issue && post.json_metadata.issue) updatedPost.json_metadata.issue = post.json_metadata.issue;

          if (moderator) {
            post.moderator = moderator;
          }

          if (reviewed) {
            post.reviewed = true;
            post.pending = false;
            post.flagged = false;

            User
              .get(post.author)
              .then(user => {
                if (user && user.github && user.github.account) {
                  if (post.json_metadata.type === 'bug-hunting') {
                    //if (post.json_metadata.type === 'bug-hunting' || post.json_metadata.type === 'ideas') {
                    request.post(`https://api.github.com/repos/${post.json_metadata.repository.full_name.toLowerCase()}/issues`)
                      .set('Content-Type', 'application/json')
                      .set('Accept', 'application/json')
                      .set('Authorization', `token ${user.github.token}`)
                      .send({
                        title: post.title,
                        body: post.body,
                      })
                      .then(resGithub => {
                        const issue = resGithub.body;
                        const { html_url, number, id, title } = issue;

                        post.json_metadata.issue = {
                          url: html_url,
                          number,
                          id,
                          title,
                        };

                        post.save()
                          .then(savedPost => res.json(savedPost))
                          .catch(e => {
                            console.log("ERROR REVIEWING POST", e);
                            next(e);
                          });
                      })
                      .catch(e => console.log(e))
                  } else {
                    post.save()
                      .then(savedPost => res.json(savedPost))
                      .catch(e => {
                        console.log("ERROR REVIEWING POST", e);
                        next(e);
                      });
                  }
                  /*
                   if (post.json_metadata.type === 'development' || post.json_metadata.type === 'documentation') {
                   if (post.json_metadata.pullRequests && post.json_metadata.pullRequests.length > 0) {
                   post.json_metadata.pullRequests.forEach((pr, index) => {
                   setTimeout(function() {
                   request.post(`https://api.github.com/repos/${post.json_metadata.repository.full_name.toLowerCase()}/issues/${pr.number}/comments`)
                   .set('Content-Type', 'application/json')
                   .set('Accept', 'application/json')
                   .set('Authorization', `token ${user.github.token}`)
                   .send({
                   body: post.body,
                   })
                   .catch(e => console.log(e));
                   }, index * 3000);
                   });
                   }
                   } */
                }
              })
              .catch(e => {
                // no user found
                post.save()
                  .then(savedPost => res.json(savedPost))
                  .catch(e => {
                    console.log("ERROR REVIEWING POST", e);
                    next(e);
                  });
              });

          } else {

            if (flagged) {
              post.flagged = true;
              post.reviewed = false;
              post.pending = false;
            }

            if (pending) {
              post.pending = true;
              post.reviewed = false;
              post.flagged = false;
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
        }
      });
    })
    .catch(e => next(e));
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

  let sort = { created: -1 };
  let query = {
    reviewed: true,
    flagged: {
      $ne : true,
    },
  };

  if (bySimilarity) {
    query = {
      ...query,
      body: {
        $regex: bySimilarity, $options: 'i'
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
    if (type !== 'announcements') {
      query = {
        ...query,
        'json_metadata.type': type,
      };
    } else {
      query = {
        ...query,
        'json_metadata.type': {
          $regex : (/announcement-/i)
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

export default { get, create, update, list, listByIssue, remove };
