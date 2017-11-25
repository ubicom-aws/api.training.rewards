import Project from '../models/project.model';
import User from '../models/user.model';
import userCtrl from '../controllers/user.controller';
import {Client, PrivateKey} from 'dsteem'
import { key_utils } from 'steem/lib/auth/ecc';
import config from '../../config/config';
import * as R from 'ramda';
const steemconnect = require('sc2-sdk');
const dSteemClient = new Client(config.steemNode);

function create(req, res, next) {
  const owner = req.body.owner;
  const access_token = req.body.access_token;
  const platform = req.body.platform;
  const external_id = req.body.external_id;
  const project_name = req.body.project_name;

  steemconnect.setBaseURL('https://v2.steemconnect.com');
  steemconnect.setAccessToken(access_token);
  steemconnect.me().then((resp) => {
    if (resp && resp.user) {
      const user = resp.user;
      if (user === owner) {
        User.get(user).then(userData => {
          if (userData && userData.github) {
            userCtrl.getGithubProjects(userData, (projects) => {
              if (projects.length) {
                const isProjectMaintainer = R.find(R.propEq("id", external_id))(projects);
                if (isProjectMaintainer) {
                  const createSuggestedPassword = () => {
                    const PASSWORD_LENGTH = 32;
                    const privateKey = key_utils.get_random_key();
                    return privateKey.toWif().substring(3, 3 + PASSWORD_LENGTH);
                  };

                  const creator = 'utopian-io';
                  const creatorKey = PrivateKey.fromLogin(creator, config.credentials.utopianPrivatePass, 'active');
                  const newAccountPassword = createSuggestedPassword();

                  const newAccountName = `${project_name}.utp`;

                  const doReg = async function() {
                    return new Promise(async function(resolve, reject) {
                      try {
                        await dSteemClient.broadcast.createAccount({
                          creator, username: newAccountName, password: newAccountPassword
                        }, creatorKey);

                        const project = new Project({
                          name: project_name,
                          platform,
                          external_id,
                          steem_account: {
                            account: newAccountName,
                            password: newAccountPassword,
                          }
                        });

                        const res = await project.save();
                        resolve(res);
                      } catch(err) {
                        reject(err);
                      }
                    });
                  }

                  return doReg().then(() => {
                    res.json({
                      project_name: newAccountName
                    });
                  }).catch((err) => res.status(500).json({error_message: err}))
                }
              }
              res.status(401);
            });
          }
        }).catch(() => res.status(401))

      } else {
        res.status(401);
      }
    } else {
      res.status(401);
    }
  });
}

export default { create };
