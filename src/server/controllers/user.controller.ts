import * as querystring from 'querystring';
import * as HttpStatus from 'http-status';
import * as request from 'superagent';
import steemAPI from '../steemAPI';
import User from '../models/user.model';
import Moderator from '../models/moderator.model';

/**
 * Load user and append to req.
 */
async function load(req, res, next, id) {
  const { params } = req;

  try {
    let user;
    if (params.platform && params.platform === 'github') {
      user = await User.getByGithub(id);
    } else {
      user = await User.get(id);
    }

    if (!user) {
      return res.sendStatus(HttpStatus.NOT_FOUND);
    }

    if (res.locals.user.account !== user.account) {
      const mod: any = Moderator.findOne({ account: res.locals.user.account });
      if (!mod || mod.banned) {
        // Prohibit regular users from retrieving other accounts
        return res.sendStatus(HttpStatus.FORBIDDEN);
      }
    }

    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Ban user
 * @property {string} req.body.username - The username of user.
 * @property {string} req.body.banned - Banning Status of user
 * @returns {User}
 **/
function ban(req, res, next) {
  console.log("=> ban() ");
  const user = req.user;
  // console.log("-> req.user ", req.user);
  console.log("-> req.body ", req.body);
  user.banned = req.body.banned;
  user.bannedBy = req.body.bannedBy;
  user.banReason = req.body.banReason;
  user.bannedUntil = req.body.bannedUntil;

  user.save()
      .then(savedUser => res.json(savedUser))
      .catch(e => next(e));
}

function getBan(req, res, next) {
  console.log("=> getban(user) ");
  const user = req.user;
  var until = new Date(0);
  if (user.bannedUntil) {
    until = user.bannedUntil;
  }
  res.json({
    banned: user.banned,
    bannedBy: user.bannedBy,
    banReason: user.banReason,
    bannedUntil: until,
  });
}

/**
 * Get user
 * @returns {User}
 */
function get(req, res) {
  const user = req.user;
  return res.json({
    account: user.account,
    banReason: user.banReason,
    bannedBy: user.bannedBy,
    bannedUntil: user.bannedUntil,
    banned: user.banned,
    details: user.details,
    github: user.github ? {
      login: user.github.login,
      account: user.github.account,
      scopeVersion: user.github.scopeVersion,
      avatar_url: user.github.avatar_url,
    } : undefined
  });
}

function getGithubRepos(user, callback) {
  var result = new Array();
  if (!user || !user.github || !user.github.token) {
    return callback(result);
  }

    request.get('https://api.github.com/user/repos')
        .query({ access_token: user.github.token, per_page: 100 })
        .then(function (response) {
            if (response && response.body.length) {
                const repos = (response.body.filter(repo => repo.owner.login === user.github.account && repo.private === false));
                for (var k = 0; k < repos.length; k++) {
                    result.push(repos[k]);
                }
                var orgs = new Array();
                request.get('https://api.github.com/user/orgs')
                    .query({ access_token: user.github.token, per_page: 100 })
                    .then(function (resp) {
                        if (resp && resp.body) {
                            const organizations = resp.body;
                            for (var i = 0; i < organizations.length; i++) {
                                orgs.push(organizations[i].login);
                            }
                            if (orgs.length === 0) {
                                callback(result);
                                return;
                            }
                            for (var j = 0; j < orgs.length; ++j) {
                                request.get(`https://api.github.com/orgs/${orgs[j]}/repos`)
                                    .query({ access_token: user.github.token, per_page: 100 })
                                    .then(function (respo) {
                                        if (respo && respo.body) {
                                            for (var m = 0; m < respo.body.length; ++m) {
                                                result.push(respo.body[m]);
                                            }
                                            if (j+1 >= orgs.length) {
                                                callback(result);
                                                return;
                                            }
                                        }
                                    })
                            }
                        } else {
                            callback(result);
                        }
                    })
            } else {
                callback(result);
            }
        });
}

function getRepos(req, res, next) {
  const user = req.user;

  if (!user) {
      res.json([]);
  }

  getGithubRepos(user, (result) => {
      if (result.length) {
          res.json(result);
      } else {
          res.status(404).json({
              message: 'No repos found on Github'
          })
      }
  });
}

function create(req, res, next) {

  const { account, code, state, scopeVersion } = req.body;

  if (code && state && (code !== "-") && (state !== "-")) {
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
                                          scopeVersion: scopeVersion,
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
                                              scopeVersion: scopeVersion,
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
  } else {
    const newUser = new User({
      account,
      github: {
          scopeVersion: 0
      }
  });
    newUser.save()
      .then(savedUser => res.json(savedUser))
      .catch(e => next(e));
  }
}

function update(req, res, next) {
  const user = req.user;
  user.username = req.body.username;
  user.mobileNumber = req.body.mobileNumber;

  user.save()
      .then(savedUser => res.json(savedUser))
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

export default { load, ban, getBan, get, getRepos, getGithubRepos, create, update, remove };
