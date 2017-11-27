import * as querystring from 'querystring';
import * as request from 'superagent';
import User from '../models/user.model';


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
<<<<<<< HEAD
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
    return res.json(req.user);
}

function getGithubRepos(user, callback) {
    var result = new Array();
    if (!user || !user.github || !user.github.token) {
        return callback(result);
    }

    request.get('https://api.github.com/user/repos')
        .query({ access_token: user.github.token })
        .then(function (response) {
            if (response && response.body.length) {
                const repos = (response.body.filter(repo => repo.owner.login === user.github.account && repo.private === false));
                for (var k = 0; k < repos.length; k++) {
                    result.push(repos[k]);
                }
                var orgs = new Array();
                request.get('https://api.github.com/user/orgs')
                    .query({ access_token: user.github.token })
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
                                    .query({ access_token: user.github.token })
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

/**
 * Create new user
 * @property {string} req.body.username - The username of user.
 * @property {string} req.body.mobileNumber - The mobileNumber of user.
 * @returns {User}
 */
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

export default { load, ban, getBan, get, getRepos, getGithubRepos, create, update, list, remove, createToken };
