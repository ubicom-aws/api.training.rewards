import Stats from './server/models/stats.model';
import Post from './server/models/post.model';
import config from './config/config';
import steem from 'steem';
import { calculatePayout } from './server/steemitHelpers';

import SteemConnect from 'sc2-sdk';
import { createCommentPermlink } from './server/steemitHelpers';
const request = require('superagent');

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  const paidRewardsDate = '1969-12-31T23:59:59';
  const botAccount = process.env.BOT;
  const refreshToken = process.env.REFRESH_TOKEN;
  const secret = process.env.CLIENT_SECRET;
  const forced = process.env.FORCED === 'true' || false;

  console.log("-----BOT-------", botAccount);
  console.log("-----TOKEN-------", refreshToken);
  console.log("-----SECRET-------", secret);


  function checkVotingPower (start = false, callback) {
    const limitPower = start ? 8500 : 6000;
    steem.api.getAccounts([botAccount], function(err, accounts) {
      if (!err) {
        const botStatus = accounts[0];

        const secondsago = (new Date().getTime() - new Date(botStatus.last_vote_time + "Z").getTime()) / 1000;
        const votingPower = botStatus.voting_power + (10000 * secondsago / 432000);

        if (votingPower <= limitPower && !forced) {
          console.log("UPS I AM SO TIRED TODAY. VOTED TOO MUCH", votingPower);
          conn.close();
          process.exit(0);
          return;
        }

        callback(votingPower);
        return;
      }
      console.log("VOTING PW ERROR", err);
      conn.close();
      process.exit(0);
    });
  }

  const now = new Date();
  const query = {
    reviewed: true,
    'active_votes.voter': { $ne: botAccount },
    created: {
      $lte: new Date(now.getTime() - 2*60*60*1000).toISOString()
    },
    cashout_time: {
      $gt: paidRewardsDate,
    },
  };

  request
    .get(`https://v2.steemconnect.com/api/oauth2/token?refresh_token=${refreshToken}&client_secret=${secret}&scope=vote,comment,comment_delete,comment_options,custom_json,claim_reward_balance,offline`)
    .end((err, res) => {
      if (!res.body.access_token) {
        console.log("COULD NOT GET ACCESS TOKEN");
        conn.close();
        process.exit(0);
        return;
      }
      if (res.body.access_token) {
        SteemConnect.setAccessToken(res.body.access_token);
      }
      checkVotingPower(true, function(){
        Stats.get()
          .then(stats => {
            const { categories } = stats;

            Post
              .list({ skip: 0, limit: 40, query, sort: { pending_payout_value: -1 } })
              .then(posts => {

                if(!posts.length) {
                  console.log("NO POSTS");
                  conn.close();
                  process.exit(0);
                  return;
                }

                console.log("FOUND POSTS TO VOTE: ", limit);

                posts.forEach((post, allPostsIndex) => {
                  steem.api.getAccounts([post.author], (err, accounts) => {
                    if (!err) {
                      if (accounts && accounts.length === 1) {
                        const account = accounts[0];

                        steem.api.getFollowCount(account.name, function(err, followers) {
                          const contributionsQuery = {
                            reviewed: true,
                            id: { $ne: post.id },
                            author: post.author,
                          };

                          Post
                            .countAll({ query: contributionsQuery })
                            .then(contributionsCount => {
                              Post
                                .list({ skip: 0, limit: contributionsCount, query })
                                .then(contributions => {
                                  const bots = [
                                        'analisa',
                                        'animus',
                                        'appreciator',
                                        'bago',
                                        'banjo',
                                        'barrie',
                                        'bellyrub',
                                        'boomerang',
                                        'booster',
                                        'boostupvote',
                                        'bowlofbitcoin',
                                        'buildawhale',
                                        'cheetah',
                                        'cleverbot',
                                        'counterbot',
                                        'cryptoowl',
                                        'cub1',
                                        'curationrus',
                                        'dirty.hera',
                                        'discordia',
                                        'done',
                                        'drotto',
                                        'emilhoch',
                                        'eoscrusher',
                                        'famunger',
                                        'feedyourminnows',
                                        'followforupvotes',
                                        'frontrunner',
                                        'gamerpool',
                                        'gaming-hangouts',
                                        'givemedatsteem',
                                        'givemesteem1',
                                        'gonewhaling',
                                        'gotvotes',
                                        'gpgiveaways',
                                        'helpfulcrypto',
                                        'htliao',
                                        'idioticbot',
                                        'ilvacca',
                                        'inchonbitcoin',
                                        'lovejuice',
                                        'makindatsteem',
                                        'minnowbooster',
                                        'minnowhelper',
                                        'minnowpond',
                                        'minnowpondblue',
                                        'minnowpondred',
                                        'minnowsupport',
                                        'morwhale',
                                        'moses153',
                                        'msp-lovebot',
                                        'msp-shanehug',
                                        'ninja-whale',
                                        'ninjawhale',
                                        'originalworks',
                                        'pharesim',
                                        'polsza',
                                        'pumpingbitcoin',
                                        'pushup',
                                        'qurator',
                                        'ramta',
                                        'randovote',
                                        'randowhale',
                                        'randowhale0',
                                        'randowhale1',
                                        'randowhaletrail',
                                        'randowhaling',
                                        'reblogger',
                                        'resteem.bot',
                                        'resteembot',
                                        'russiann',
                                        'scamnotifier',
                                        'sneaky-ninja',
                                        'spinbot',
                                        'steemholder',
                                        'steemit-gamble',
                                        'steemit-hangouts',
                                        'steemitboard',
                                        'steemmaker',
                                        'steemmemes',
                                        'steemminers',
                                        'steemode',
                                        'steemprentice',
                                        'steemthat',
                                        'steemvoter',
                                        'qurator',
  							                    		'mahdiyari',
                                        'officialfuzzy',
  							                    		'fuzzyvest',
                                      };

                                      SteemConnect.vote(botAccount, post.author, post.permlink, vote * 100)
                                        .then(() => {
                                          console.log("NOW SUBMITTING COMMENT FROM THEN");
                                          comment();
                                        }).catch(e => {
                                        // I think there is a problem with sdk. Always gets in the catch
                                        if (e.error_description == undefined) {

                                          stats.utopian_votes = [
                                            ...stats.utopian_votes,
                                            {
                                              date: new Date().toISOString(),
                                              weight: vote * 100,
                                              permlink: post.permlink,
                                              author: post.author,
                                            }
                                          ];

                                          stats.save();

                                          console.log("NOW SUBMITTING COMMENT FROM CATCH");
                                          comment();
                                        }
                                      });
                                    });
                                  }, allPostsIndex === 0 || 30000 * allPostsIndex);
                                });
                            });
                        });
                      }
                    }
                  });
                });
              });
          });
      });
    });
});
