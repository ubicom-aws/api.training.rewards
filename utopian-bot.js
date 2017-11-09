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

                console.log("FOUND POSTS TO VOTE: ", posts.length);

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
                                    'whatupgg',
                                    'burdok213',
                                    'besttocome215',
                                    'drakkald',
                                    'heelpopulair',
                                    'portoriko',
                                    'blimbossem',
                                    'weareone1',
                                    'raidrunner',
                                    'sniffo35',
                                    'ikwindje',
                                    'bierkaart',
                                    'waardanook',
                                    'zdashmash',
                                    'misterwister',
                                    'ipuffyou',
                                    'wildoekwind',
                                    'scharmebran',
                                    'siliwilly',
                                    'prambarbara',
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
                                    'mahdiyari',
                                    'officialfuzzy',
                                    'fuzzyvest',
                                  ];
                                  const reputation = steem.formatter.reputation(account.reputation);

                                  const categoryStats = categories[post.json_metadata.type];
                                  let contributionsTotalVotes = 0;
                                  contributions.forEach(contribution => contributionsTotalVotes = contributionsTotalVotes + contribution.net_votes);
                                  const contributionsTotalVotesAverage = contributionsTotalVotes > 0 && contributionsCount > 0 ? contributionsTotalVotes / contributionsCount : 0;

                                  const bodyLength = post.body.length;
                                  const average_posts_length = Math.round(categoryStats.average_posts_length);
                                  const bodyBiggerThanAverage = bodyLength > average_posts_length;
                                  const bodyLessThanAverage = bodyLength < average_posts_length;
                                  // if it does not meet the average for only 1000 chars, still considering it average
                                  const bodyInAverage = bodyLength === average_posts_length || bodyLength + 500 >= average_posts_length || bodyLength >= average_posts_length - 500;

                                  const tags = post.json_metadata.tags.length;
                                  const average_tags_per_post = Math.round(categoryStats.average_tags_per_post);
                                  const tagsMoreThanAverage = tags > average_tags_per_post;
                                  const tagsLessThanAverage = tags < average_tags_per_post;
                                  const tagsInAverage = tags === average_tags_per_post;

                                  const links = post.json_metadata.links ? post.json_metadata.links.length : 0;
                                  const average_links_per_post = Math.round(categoryStats.average_links_per_post);
                                  const linksLessThanAverage = links < average_links_per_post;

                                  const average_likes_per_post = Math.round(categoryStats.average_likes_per_post);
                                  const votesInAverage = post.net_votes === average_likes_per_post || post.net_votes + 5 >= average_likes_per_post || post.net_votes >= average_likes_per_post - 5;
                                  const votesMoreThanAverage = post.net_votes > average_likes_per_post;

                                  const payoutDetails = calculatePayout(post);
                                  const totalGenerating = categoryStats.average_paid_authors + categoryStats.average_paid_curators;
                                  const suggestions = [];
                                  const achievements = [];

                                  let vote = 0;

                                  /** BEGIN Adding fixed voting weights for categories where actual work is required */

                                  // we love devs
                                  if (post.json_metadata.type === 'development') {
                                    vote = vote + 12.5;
                                    console.log('+12.5 developer');
                                    achievements.push('I am a bot...I love developers... <3');
                                  }
                                  if (post.json_metadata.type === 'bug-hunting') {
                                    vote = vote + 2.5;
                                    console.log('+2.5 bug hunter');
                                    achievements.push('I am a bot...I need someone spotting my bugs!');
                                  }

                                  if (post.json_metadata.type === 'translations') {
                                    vote = vote + 5;
                                    console.log('+5 translator');
                                    achievements.push('You are helping this project go global! Appreciated!');
                                  }

                                  if (post.json_metadata.type === 'graphics') {
                                    vote = vote + 5;
                                    console.log('+5 graphic');
                                    achievements.push('Creativity makes the World a better place. Thanks!');
                                  }

                                  if (post.json_metadata.type === 'analysis') {
                                    vote = vote + 5;
                                    console.log('+5 analysis');
                                    achievements.push('Oh I love when we talk about data!');
                                  }

                                  /** END Adding fixed voting weights for categories where actual work is required */


                                  // POSITIVE VOTES
                                  if (tagsInAverage || tagsMoreThanAverage) vote++;

                                  if(bodyInAverage) {
                                    vote = vote++;
                                    console.log('+1 body average');
                                    achievements.push('Good amount of information. Thank you!');
                                  };
                                  if (bodyBiggerThanAverage) {
                                    // length of the body bigger than average in its category. The contribution is informative
                                    if (bodyLength - 4000 > average_posts_length) {
                                      vote = vote++;
                                      console.log('+1 body bigger - 4000');
                                    }
                                    if (bodyLength - 8000 > average_posts_length) {
                                      vote = vote++;
                                      console.log('+1 body bigger - 8000');
                                    }
                                    if (bodyLength - 16000 > average_posts_length) {
                                      vote = vote++;
                                      console.log('+1 body bigger - 16000');
                                    }
                                    achievements.push('Much more informative than others in this category. Good job!');
                                  };

                                  if (votesInAverage) {
                                    vote++;
                                    console.log('+1 votes in average');
                                    achievements.push('Votes on this contribution are going well. Nice!');
                                  }
                                  if (votesMoreThanAverage) {
                                    // the contribution is having more than average votes
                                    vote = vote++;
                                    console.log('+1 votes more than average');

                                    if (post.net_votes - 20 > average_likes_per_post) {
                                      vote = vote++;
                                      console.log('+1 votes in average - 20');
                                    }
                                    if (post.net_votes - 40 > average_likes_per_post) {
                                      vote = vote++;
                                      console.log('+1 votes in average - 40');
                                    }
                                    if (post.net_votes - 80 > average_likes_per_post) {
                                      vote = vote + 5;
                                      console.log('+5 votes in average - 80');
                                    }
                                    achievements.push('You are having more votes than average for this category. Nice!');
                                  };

                                  if(followers.follower_count < 250) {
                                    vote = vote + 2.5;
                                    console.log('+2.5 less than 250 followers');
                                    achievements.push('You have less than 250 followers. Just gave you a gift ;)');
                                  }

                                  if (post.net_votes > followers.follower_count && followers.follower_count > 0) {
                                    // giving a tip for account swith small followers or 0
                                    vote = vote + 2.5;
                                    console.log('+2.5 votes bigger followers');
                                    achievements.push('You just got more votes than your total number of followers. Rock Star!');
                                  }

                                  if (payoutDetails.potentialPayout > totalGenerating) {
                                    // the contribution is generating big payouts
                                    vote = vote + 5;
                                    console.log('+5 payout bigger');

                                    if (payoutDetails.potentialPayout - 20 > totalGenerating) {
                                      vote = vote + 2.5;
                                      console.log('+2.5 payout bigger - 20');
                                    }
                                    if (payoutDetails.potentialPayout - 40 > totalGenerating) {
                                      vote = vote + 5;
                                      console.log('+5 payout bigger - 40');
                                    }
                                    if (payoutDetails.potentialPayout - 80 > totalGenerating) {
                                      vote = vote + 10;
                                      console.log('+10 payout bigger - 80');
                                    }
                                    if (payoutDetails.potentialPayout - 150 > totalGenerating) {
                                      vote = vote + 15;
                                      console.log('+15 payout bigger - 150');
                                    }
                                    achievements.push('You are generating more rewards than average for this category. Super!');
                                  }

                                  // reputation of the user
                                  if(reputation > 25) vote++;
                                  if(reputation >= 35) vote++;
                                  if(reputation >= 50) vote++;
                                  if(reputation >= 70) vote++;
                                  if(reputation >= 80) vote++;

                                  if (contributionsCount === 0) {
                                    // this is the first contribution of the user accepted in the Utopian feed
                                    // give the user a little gift
                                    vote = vote + 5;
                                    console.log('+5 first contribution');
                                    achievements.push('This is your first accepted contribution here in Utopian. Welcome!');
                                  }

                                  // number of contributions in total
                                  if (contributionsCount >= 5) {
                                    // git for being productive
                                    vote = vote++;
                                    console.log('+1 more 5 contr');

                                    if (contributionsCount >= 15) {
                                      // git for being productive
                                      vote = vote + 2.5;
                                      console.log('+1 more 15 contr');
                                    }
                                    if (contributionsCount >= 30) {
                                      // git for being productive
                                      vote = vote + 5;
                                      console.log('+5s more 30 contr');
                                    }
                                    if (contributionsCount >= 60) {
                                      // git for being productive
                                      vote = vote + 10;
                                      console.log('+10 more 60 contr');
                                    }
                                    achievements.push('Seems like you contribute quite often. AMAZING!');
                                  }

                                  // average of votes this user has on all his contributions
                                  if (contributionsTotalVotesAverage > 30) {
                                    vote = vote + 2.5;
                                    console.log('+2.5 average votes total 30');

                                    if (contributionsTotalVotesAverage > 60) {
                                      vote = vote + 2.5;
                                      console.log('+5 average votes total 50');
                                    }
                                    if (contributionsTotalVotesAverage > 120) {
                                      vote = vote + 5;
                                      console.log('+5 average votes total 120');
                                    }
                                    if (contributionsTotalVotesAverage > 300) {
                                      vote = vote + 10;
                                      console.log('+10 average votes total 300');
                                    }

                                    achievements.push('You have a good amount of votes on your contributions. Good job!');
                                  }

                                  if (contributionsTotalVotesAverage > categoryStats.average_likes_per_post) {
                                    // the user has more votes than average on his contributions in total
                                    vote = vote + 5;
                                    console.log('+5 average votes bigger total category');
                                    achievements.push('In total you have more votes than average for this category. Bravo!');
                                  }

                                  if (achievements.length > 5) {
                                    // WOW a lot of achievements. Better to give a gift
                                    vote = vote + 5;
                                    console.log('+5 5 achievements');
                                    achievements.push(`You have just unlocked ${achievements.length} achievements. Yeah!`);
                                  }

                                  // NEGATIVE VOTES
                                  if(reputation < 25) vote--;
                                  if(reputation < 15) vote--;
                                  if(reputation < 5) vote--;
                                  if(reputation < 0) vote--;

                                  if (tagsLessThanAverage) vote--;
                                  if (linksLessThanAverage) vote--;

                                  if (bodyLessThanAverage) {
                                    if(average_posts_length - bodyLength > 4000) {
                                      vote = vote - 5;
                                    }
                                    if(average_posts_length - bodyLength > 8000) {
                                      vote = vote - 10;
                                    }
                                    if(average_posts_length - bodyLength > 16000) {
                                      vote = vote - 15;
                                    }
                                    if(average_posts_length - bodyLength > 30000) {
                                      vote = vote - 20;
                                    }
                                    suggestions.push('Your contribution is less informative than others in this category.');
                                  }

                                  let foundBots = 0;
                                  post.active_votes.forEach((voted, index) => {
                                    if (bots.indexOf(voted.voter) > -1) {
                                      vote = vote - 2.5;
                                      foundBots++;
                                    }
                                  });
                                  if (foundBots > 0) suggestions.push('Utopian has detected ' + foundBots + ' bot votes. I am the only bot you should love!!');

                                  vote = Math.round(vote);
                                  if(vote <= 0) vote = 1;
                                  if(vote > 100) vote = 100;


                                  let commentBody = '';

                                  if (vote > 0) {
                                    commentBody = `### Hey @${post.author} I am @${botAccount}. I have just super-voted you at ${vote}% Power!\n`;
                                  } else {
                                    commentBody = `### Hey @${post.author} I am @${botAccount}. So sad I couldn't super-vote this time!\n`;
                                  }

                                  if (suggestions.length > 0) {
                                    commentBody += '#### Suggestions https://utopian.io/rules\n';
                                    suggestions.forEach(suggestion => commentBody += `-${suggestion}\n`);
                                  }

                                  if (achievements.length > 0) {
                                    commentBody += '#### Achievements\n';
                                    achievements.forEach(achievement => commentBody += `-${achievement}\n`);
                                  }

                                  commentBody += '**Up-vote this comment to grow my power and help Open Source contributions like this one.**';

                                  console.log("-----VOTING AUTHOR-------", post.author);
                                  console.log("VOTING PERMLINK", post.permlink);
                                  console.log("VOTING VOTE", vote);
                                  console.log("------------------------", post.author);

                                  setTimeout(function() {
                                    checkVotingPower(false, function() {

                                      achievements.forEach(achievement => console.log(achievement));
                                      suggestions.forEach(suggestion => console.log(suggestion));

                                      const jsonMetadata = { tags: ['utopian-io'], community: 'utopian', app: `utopian/1.0.0` };

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
                                          console.log("COMMENT SUBMITTED FROM THEN");
                                          if (allPostsIndex + 1 === posts.length) {
                                            conn.close();
                                            process.exit(0);
                                          }
                                        }).catch(e => {
                                          if (e.error_description == undefined) {
                                            console.log("COMMENT SUBMITTED FROM THEN");
                                          } else {
                                            console.log("COMMENT ERROR", e);
                                          }
                                        });
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
                                  }, allPostsIndex === 0 ? 120000 : 120000 * allPostsIndex);
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
