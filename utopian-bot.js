import Stats from './server/models/stats.model';
import Post from './server/models/post.model';
import config from './config/config';
import steem from 'steem';

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
  const now = new Date();
  const MAX_VOTE_EVER = 35;
  const MAX_USABLE_POOL = 10000;

  const bots = [
    'animus',
    'appreciator',
    'arama',
    'ausbitbot',
    'bago',
    'bambam808',
    'banjo',
    'barrie',
    'bellyrub',
    'besttocome215',
    'bierkaart',
    'biskopakon',
    'blackwidow7',
    'blimbossem',
    'boomerang',
    'booster',
    'boostupvote',
    'bowlofbitcoin',
    'bp423',
    'brandybb',
    'brensker',
    'btcvenom',
    'buildawhale',
    'burdok213',
    'businessbot',
    'centerlink',
    'cleverbot',
    'cnbuddy',
    'counterbot',
    'crypto-hangouts',
    'cryptobooty',
    'cryptoholic',
    'cryptoowl',
    'cub1',
    'curationrus',
    'dahrma',
    'davidding',
    'decibel',
    'deutschbot',
    'dirty.hera',
    'discordia',
    'done',
    'drakkald',
    'drotto',
    'earthboundgiygas',
    'edrivegom',
    'emilhoch',
    'eoscrusher',
    'famunger',
    'feedyourminnows',
    'followforupvotes',
    'frontrunner',
    'fuzzyvest',
    'gamerpool',
    'gamerveda',
    'gaming-hangouts',
    'gindor',
    'givemedatsteem',
    'givemesteem1',
    'glitterbooster',
    'gonewhaling',
    'gotvotes',
    'gpgiveaways',
    'gsgaming',
    'guarddog',
    'heelpopulair',
    'helpfulcrypto',
    'idioticbot',
    'ikwindje',
    'ilvacca',
    'inchonbitcoin',
    'ipuffyou',
    'lovejuice',
    'mahabrahma',
    'make-a-whale',
    'makindatsteem',
    'maradaratar',
    'minnowbooster',
    'minnowhelper',
    'minnowpond',
    'minnowpondblue',
    'minnowpondred',
    'minnowsupport',
    'misterwister',
    'moonbot',
    'morwhale',
    'moses153',
    'moyeses',
    'msp-lovebot',
    'msp-shanehug',
    'muxxybot',
    'myday',
    'ninja-whale',
    'ninjawhale',
    'officialfuzzy',
    'perennial',
    'pimpoesala',
    'polsza',
    'portoriko',
    'prambarbara',
    'proctologic',
    'pumpingbitcoin',
    'pushup',
    'qurator',
    'qwasert',
    'raidrunner',
    'ramta',
    'randovote',
    'randowhale',
    'randowhale0',
    'randowhale1',
    'randowhaletrail',
    'randowhaling',
    'reblogger',
    'resteem.bot',
    'resteemable',
    'resteembot',
    'russiann',
    'scamnotifier',
    'scharmebran',
    'siliwilly',
    'sneaky-ninja',
    'sniffo35',
    'soonmusic',
    'spinbot',
    'stackin',
    'steemedia',
    'steemholder',
    'steemit-gamble',
    'steemit-hangouts',
    'steemitgottalent',
    'steemmaker',
    'steemmemes',
    'steemminers',
    'steemode',
    'steemprentice',
    'steemsquad',
    'steemthat',
    'steemvoter',
    'stephen.king989',
    'tabea',
    'tarmaland',
    'timbalabuch',
    'trail1',
    'trail2',
    'trail3',
    'trail4',
    'trail5',
    'trail6',
    'trail7',
    'viraltrend',
    'votey',
    'waardanook',
    'wahyurahadiann',
    'wannabeme',
    'weareone1',
    'whatamidoing',
    'whatupgg',
    'wildoekwind',
    'wiseguyhuh',
    'wistoepon',
    'zdashmash',
    'zdemonz',
    'zhusatriani'
  ];
  const query = {
    reviewed: true,
    'active_votes.voter': { $ne: botAccount },
    created: {
      $lte: new Date(now.getTime() - 6*60*60*1000).toISOString()
    },
    cashout_time: {
      $gt: paidRewardsDate,
    },
  };

  console.log("-----BOT-------", botAccount);
  console.log("-----TOKEN-------", refreshToken);
  console.log("-----SECRET-------", secret);


  const checkVotingPower = (callback) => {
    const limitPower = 10000;
    steem.api.getAccounts([botAccount], function(err, accounts) {
      if (!err) {
        const botStatus = accounts[0];

        const secondsago = (new Date().getTime() - new Date(botStatus.last_vote_time + "Z").getTime()) / 1000;
        const votingPower = botStatus.voting_power + (10000 * secondsago / 432000);

        if (votingPower < limitPower && !forced) {
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


  const proceedVoting = (scoredPosts, categories_pool) => {
    scoredPosts.forEach((post, index) => {
      setTimeout(function(){
        const finalScore = post.finalScore;
        const category = post.category;
        const assignedWeight = (finalScore / categories_pool[category].total_vote_weight * 100) * categories_pool[category].assigned_pool / 100;
        const calculatedVote = Math.round(assignedWeight / categories_pool[category].assigned_pool * 100);
        const finalVote = calculatedVote >= MAX_VOTE_EVER ? MAX_VOTE_EVER : calculatedVote;

        const achievements = post.achievements;
        const jsonMetadata = { tags: ['utopian-io'], community: 'utopian', app: `utopian/1.0.0` };
        let commentBody = '';

        commentBody = `### Hey @${post.author} I am @${botAccount}. I have just voted you at ${finalVote}% Power!\n`;

        if (achievements.length > 0) {
          commentBody += '#### Achievements\n';
          achievements.forEach(achievement => commentBody += `- ${achievement}\n`);
        }

        commentBody += '**Up-vote this comment to grow my power and help Open Source contributions like this one. Want to chat? Join me on Discord https://discord.gg/Pc8HG9x**';

        console.log('--------------------------------------\n');
        console.log('https://utopian.io/utopian-io/@'+post.author+'/'+post.permlink);
        console.log('VOTE:' + finalVote + '\n');
        console.log(commentBody);
        console.log('--------------------------------------\n');

        const comment = () => {
          SteemConnect.comment(
            post.author,
            post.permlink,
            botAccount,
            createCommentPermlink(post.author, post.permlink),
            '',
            commentBody,
            jsonMetadata,
          ).then(() => {
            if (i + 1 === posts.length) {
              conn.close();
              process.exit(0);
            }
          }).catch(e => {
            if (e.error_description == undefined) {
              console.log("COMMENT SUBMITTED");
              if (index + 1 === scoredPosts.length) {
                conn.close();
                process.exit();
              }
            } else {
              console.log("COMMENT ERROR", e);
            }
          });
        };

        SteemConnect.vote(botAccount, post.author, post.permlink, post.real_vote * 100)
          .then(() => {
            comment();
          }).catch(e => {
          // I think there is a problem with sdk. Always gets in the catch
          if (e.error_description == undefined) {
            console.log("VOTED");
            comment();
          }
        });
      }, index * 30000);
    })
  };

  request
    .get(`https://v2.steemconnect.com/api/oauth2/token?refresh_token=${refreshToken}&client_secret=${secret}&scope=vote,comment,comment_delete,comment_options,custom_json,claim_reward_balance,offline`)
    .end((err, res) => {
      if (!res.body.access_token) {
        console.log("COULD NOT GET ACCESS TOKEN", res);
        conn.close();
        process.exit(0);
        return;
      }
      if (res.body.access_token) {
        SteemConnect.setAccessToken(res.body.access_token);
      }
      checkVotingPower(function(){
        Stats.get()
          .then(stats => {
            steem.api.getRewardFund('post', (err, rewardFund) => {
              const {categories} = stats;
              Post
                .countAll({query})
                .then(limit => {
                  Post
                    .list({skip: 0, limit: limit, query, sort: {net_votes: -1}})
                    .then(posts => {
                      const scoredPosts = [];

                      if (!posts.length) {
                        console.log("NO POSTS");
                        conn.close();
                        process.exit(0);
                        return;
                      }

                      console.log("FOUND POSTS TO VOTE: ", limit);

                      const categories_pool = {
                        "ideas": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'ideas').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "sub-projects": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'sub-projects').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "development": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'development').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "bug-hunting": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'bug-hunting').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "translations": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'translations').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "graphics": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'graphics').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "analysis": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'analysis').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "social": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'social').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "documentation": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'documentation').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "tutorials": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'tutorials').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "video-tutorials": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'video-tutorials').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "copywriting": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'copywriting').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "blog": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type === 'blog').length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                        "tasks-requests": {
                          "assigned_pool": (posts.filter(post => post.json_metadata.type.indexOf('task-') > -1).length / posts.length * 100) * MAX_USABLE_POOL / 100,
                          "total_vote_weight": 0,
                        },
                      }

                      console.log(categories_pool);

                      posts.forEach((post, allPostsIndex) => {
                        steem.api.getAccounts([post.author], (err, accounts) => {
                          if (!err) {
                            if (accounts && accounts.length === 1) {
                              const account = accounts[0];

                              steem.api.getFollowCount(account.name, function (err, followers) {
                                const contributionsQuery = {
                                  reviewed: true,
                                  id: {$ne: post.id},
                                  author: post.author,
                                };

                                Post
                                  .countAll({query: contributionsQuery})
                                  .then(contributionsCount => {

                                    const achievements = [];
                                    const categoryStats = categories[post.json_metadata.type];
                                    const averageRewards = categoryStats.average_paid_authors + categoryStats.average_paid_curators;
                                    const reputation = steem.formatter.reputation(account.reputation);
                                    const votes = post.active_votes.filter(vote => bots.indexOf(vote.voter) <= 0);
                                    const getUpvotes = activeVotes => activeVotes.filter(vote => vote.percent > 0);
                                    const upVotes = getUpvotes(votes);
                                    let totalGenerated = 0;
                                    let totalWeightPercentage = 0;

                                    upVotes.forEach((upVote, upVoteIndex) => {
                                      const totalPayout = parseFloat(post.pending_payout_value)
                                        + parseFloat(post.total_payout_value)
                                        + parseFloat(post.curator_payout_value);

                                      const voteRshares = votes.reduce((a, b) => a + parseFloat(b.rshares), 0);
                                      const ratio = totalPayout / voteRshares;
                                      const voteValue = upVote.rshares * ratio;
                                      const upvotePercentageOnTotal = (voteValue / totalPayout) * 100;

                                      totalGenerated = totalGenerated + voteValue;
                                      // fallback mechanism for big accounts never voting at their 100%. Using instead the impact on their vote on the amount of rewards
                                      totalWeightPercentage = totalWeightPercentage + (upvotePercentageOnTotal > upVote.percent ? upvotePercentageOnTotal : upVote.percent);
                                    });

                                    const averageWeightPercentage = totalWeightPercentage / upVotes.length / 100;
                                    const rankConsensus = averageWeightPercentage * upVotes.length / 100;
                                    let finalScore = rankConsensus;

                                    if (finalScore > MAX_VOTE_EVER) {
                                      achievements.push('WOW WOW WOW People loved what you did here. GREAT JOB!');
                                    }

                                    // help the user grow the followers
                                    if(followers.follower_count < 500) {
                                      finalScore = finalScore + 5;
                                      achievements.push('You have less than 500 followers. Just gave you a gift to help you succeed!');
                                    }
                                    if(totalGenerated > averageRewards) {
                                      finalScore = finalScore + 5;
                                      achievements.push('You are generating more rewards than average for this category. Super!;)');
                                    }
                                    if (contributionsCount === 0) {
                                      // this is the first contribution of the user accepted in the Utopian feed
                                      // give the user a little gift
                                      finalScore = finalScore + 5;
                                      achievements.push('This is your first accepted contribution here in Utopian. Welcome!');
                                    }
                                    // number of contributions in total
                                    if (contributionsCount > 0) {
                                      if (contributionsCount >= 15) {
                                        // git for being productive
                                        finalScore = finalScore + 2.5;
                                      }
                                      if (contributionsCount >= 30) {
                                        // git for being productive
                                        finalScore = finalScore + 2.5;
                                      }
                                      if (contributionsCount >= 60) {
                                        // git for being productive
                                        finalScore = finalScore + 2.5;
                                      }
                                      if (contributionsCount >= 120) {
                                        // git for being productive
                                        finalScore = finalScore + 2.5;
                                      }
                                      achievements.push('Seems like you contribute quite often. AMAZING!');
                                    }

                                    if(reputation >= 25) finalScore++;
                                    if(reputation >= 35) finalScore++;
                                    if(reputation >= 50) finalScore++;
                                    if(reputation >= 60) finalScore++;
                                    if(reputation >= 70) finalScore++;

                                    post.finalScore = finalScore >= 100 ? 100 : Math.round(finalScore);
                                    post.achievements = achievements;
                                    post.category = post.json_metadata.type.indexOf('task-') > - 1 ? 'tasks-requests' : post.json_metadata.type;

                                    if (post.json_metadata.type.indexOf('task-') > - 1) {
                                      categories_pool['tasks-requests'].total_vote_weight = categories_pool['tasks-requests'].total_vote_weight + finalScore;
                                    }else{
                                      categories_pool[post.json_metadata.type].total_vote_weight = categories_pool[post.json_metadata.type].total_vote_weight + finalScore;
                                    }

                                    scoredPosts.push(post);

                                    if (allPostsIndex + 1 === posts.length) {
                                      proceedVoting(scoredPosts, categories_pool);
                                    }
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
    });
});
