import User from '../models/user.model';
import querystring from 'querystring';
import request from 'superagent';


/**
 * Load user and append to req.
 */
function load(req, res, next, id) {
  const { params } = req;

  if (params.platform && params.platform === 'github') {
    User.getByGithub(id)
      .then((user) => {
        req.user = user;
        return next();
      })
      .catch(e => next(e));
  } else {
    User.get(id)
      .then((user) => {
        req.user = user;
        return next();
      })
      .catch(e => next(e));
  }
}

function createToken(req, res, next) {
  const { code } = req.query;

  request.get(`https://v2.steemconnect.com/api/oauth2/token?code=${code}&client_secret=${process.env.UTOPIAN_STEEMCONNECT_SECRET}&scope=offline,vote,comment,comment_delete,comment_options,custom_json,claim_reward_balance`)
    .end(function(err, resRefresh){
      if (resRefresh && resRefresh.text) {
        const response = JSON.parse(resRefresh.text) || null;
        if(response && response.refresh_token) {
          const accessToken = response.access_token;
          const refreshToken = response.refresh_token;
          const expiresIn = response.expires_in;
          const account = response.username;

          if (accessToken && expiresIn) {
            User.get(account)
              .then((user) => {
                user.refresh_token = refreshToken;
                user.save().then(() => {
                  res.status(200).send({ access_token: accessToken, username: account, expires_in: expiresIn });
                });
              })
              .catch(e => {
                if (e.status === 404) {
                  const newUser = new User({
                    account: account,
                    refresh_token: refreshToken,
                  });

                  newUser.save().then(() => {
                    res.status(200).send({ access_token: accessToken, username: account, expires_in: expiresIn });
                  });
                } else {
                  res.status(500);
                }
              });
          } else {
            res.status(401).send({ error: 'access_token or expires_in Missing' });
          }
        } else {
          res.status(401).send({ error: 'access_token or expires_in Missing' });
        }
      }else {
        res.status(401).send({ error: 'access_token or expires_in Missing' });
      }
    });
}

/**
 * Get user
 * @returns {User}
 */
function get(req, res) {
  return res.json(req.user);
}

function getProjects (req, res, next) {
  const user = req.user;

  request.get('https://api.github.com/user/repos')
    .query({access_token: user.github.token})
    .end(function(err, response){
      if(!err) {
        const repos = response.body;
        if (repos.length > 0) {
          res.json(repos.filter(repo => repo.owner.login === user.github.account && repo.private === false));
        } else {
          res.status(404).json({
            message: 'Cannot find project for this account'
          });;
        }
      } else {
        res.status(403).json({
          message: 'Server refuses to give details of the account'
        })
      }
    })
}

/**
 * Create new user
 * @property {string} req.body.username - The username of user.
 * @property {string} req.body.mobileNumber - The mobileNumber of user.
 * @returns {User}
 */
function create(req, res, next) {
  const { account, code, state } = req.body;

  if (code && state) {
    request.post('https://github.com/login/oauth/access_token')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({
        code,
        state,
        client_id: process.env.UTOPIAN_GITHUB_CLIENT_ID,
        client_secret: process.env.UTOPIAN_GITHUB_SECRET,
        redirect_uri: process.env.UTOPIAN_GITHUB_REDIRECT_URL,
      })
      .then(tokenRes => {
        const response = tokenRes.body;
        if(response.access_token) {
          const access_token = response.access_token;

          request.get('https://api.github.com/user')
            .query({access_token})
            .end(function(err, githubUserRes){
              const githubUser = githubUserRes.body;

              if (githubUser.login) {
                const githubUserName = githubUser.login;
                User.get(account)
                  .then((user) => {
                    user.github = {
                      account: githubUserName,
                      token: access_token,
                      ...githubUser,
                    };
                    user.save()
                      .then(savedUser => res.json(savedUser))
                      .catch(e => next(e));
                  }).catch(e => {
                    if (e.status === 404) {
                      const newUser = new User({
                        account,
                        github: {
                          account: githubUserName,
                          token: access_token,
                          ...githubUser,
                        }
                      });
                      newUser.save()
                        .then(savedUser => res.json(savedUser))
                        .catch(e => next(e));
                    } else {
                      res.status(500);
                    }
                });
              }else {
                res.status(500);
              }
            });
        } else {
          res.status(500);
        }
      })
      .catch(e => res.status(500))
  }
}

/**
 * Update existing user
 * @property {string} req.body.username - The username of user.
 * @property {string} req.body.mobileNumber - The mobileNumber of user.
 * @returns {User}
 */
function update(req, res, next) {
  const user = req.user;
  user.username = req.body.username;
  user.mobileNumber = req.body.mobileNumber;

  user.save()
    .then(savedUser => res.json(savedUser))
    .catch(e => next(e));
}

/**
 * Get user list.
 * @property {number} req.query.skip - Number of users to be skipped.
 * @property {number} req.query.limit - Limit number of users to be returned.
 * @returns {User[]}
 */
function list(req, res, next) {
  const { limit = 50, skip = 0 } = req.query;
  User.list({ limit, skip })
    .then(users => res.json(users))
    .catch(e => next(e));
}

/**
 * Delete user.
 * @returns {User}
 */
function remove(req, res, next) {
  const user = req.user;
  user.remove()
    .then(deletedUser => res.json(deletedUser))
    .catch(e => next(e));
}

export default { load, get, getProjects, create, update, list, remove, createToken };
