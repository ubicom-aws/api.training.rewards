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

  console.log("-----BOT-------", botAccount);
  console.log("-----TOKEN-------", refreshToken);
  console.log("-----SECRET-------", secret);

  const now = new Date();
  const limit = 30;
  const query = {
    reviewed: true,
    'active_votes.voter': { $ne: botAccount },
    created: {
      $lte: new Date(now.getTime() - 1*60*60*1000).toISOString()
    },
    cashout_time: {
      $gt: paidRewardsDate,
    },
  };

  request
    .get(`https://v2.steemconnect.com/api/oauth2/token?refresh_token=${refreshToken}&client_secret=${secret}&scope=vote,comment,comment_delete,comment_options,custom_json,claim_reward_balance,offline`)
    .end((err, res) => {
      if (res.body.access_token) {
        SteemConnect.setAccessToken(res.body.access_token);
      } else {
        conn.close();
        process.exit(0);
        return;
      }

      steem.api.getAccounts(['utopian-io'], function(err, accounts){
        if (!err) {
          const botStatus = accounts[0];

          const secondsago = (new Date().getTime() - new Date(botStatus.last_vote_time + "Z").getTime()) / 1000;
          const votingPower = botStatus.voting_power + (10000 * secondsago / 432000);

          if(votingPower <= 5100) {
            console.log("UPS I AM SO TIRED TODAY. VOTED TOO MUCH", votingPower);
            conn.close();
            process.exit(0);
            return;
          }

          Stats.get()
            .then(stats => {
              const { categories } = stats;

              Post
                .list({ skip: 0, limit: limit, query, sort: { net_votes: -1 } })
                .then(posts => {
                  if(posts.length > 0) {
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
                                        'voter',
                                        'booster',
                                        'sneaky-ninja',
                                        'boomerang',
                                        'lovejuice',
                                        'buildawhale',
                                        'minnowhelper',
                                        'discordia',
                                        'bellyrub',
                                        'minnowbooster',
                                        'randowhale',
                                        'minnowpond',
                                        'resteembot',
                                        'originalworks',
                                        'treeplanter',
                                        'followforupvotes',
                                        'steemthat',
                                        'frontrunner',
                                        'steemvoter',
                                        'morwhale',
                                      ];
                                      const reputation = steem.formatter.reputation(account.reputation);
                                      const posting_rewards = account.posting_rewards;
                                      const curation_rewards = account.curation_rewards;

                                      const categoryStats = categories[post.json_metadata.type];
                                      let contributionsTotalVotes = 0;
                                      contributions.forEach(contribution => contributionsTotalVotes = contributionsTotalVotes + contribution.net_votes);
                                      const contributionsTotalVotesAverage = contributionsTotalVotes > 0 && contributionsCount > 0 ? contributionsTotalVotes / contributionsCount : 0;

                                      const bodyLength = post.body.length;
                                      const average_posts_length = Math.round(categoryStats.average_posts_length);
                                      const bodyBiggerThanAverage = bodyLength > average_posts_length;
                                      const bodyLessThanAverage = bodyLength < average_posts_length;
                                      // if it does not meet the average for only 1000 chars, still considering it average
                                      const bodyInAverage = bodyLength === average_posts_length || bodyLength + 1000 >= average_posts_length;

                                      const tags = post.json_metadata.tags.length;
                                      const average_tags_per_post = Math.round(categoryStats.average_tags_per_post);
                                      const tagsMoreThanAverage = tags > average_tags_per_post;
                                      const tagsLessThanAverage = tags < average_tags_per_post;
                                      // if it does not meet the average for only 1 tag, still considering it average
                                      const tagsInAverage = tags === average_tags_per_post || tags + 1 === average_tags_per_post;

                                      const images = post.json_metadata.image ? post.json_metadata.image.length : (post.body.match(/<img/g) || []).length;
                                      const average_images_per_post = Math.round(categoryStats.average_images_per_post);
                                      const imagesMoreThanAverage = images > average_images_per_post;
                                      const imagesLessThanAverage = images < average_images_per_post;
                                      // if it does not meet the average for only 1 image, still considering it average
                                      const imagesInAverage = images === average_images_per_post || images + 1 === average_images_per_post;

                                      const links = post.json_metadata.links ? post.json_metadata.links.length : 0;
                                      const average_links_per_post = Math.round(categoryStats.average_links_per_post);
                                      const linksMoreThanAverage = links > average_links_per_post;
                                      const linksLessThanAverage = links < average_links_per_post;
                                      // if it does not meet the average for only 1 link, still considering it average
                                      const linksInAverage = links === average_links_per_post || links + 1 === average_links_per_post;

                                      const average_likes_per_post = Math.round(categoryStats.average_likes_per_post);
                                      const votesInAverage = post.net_votes === average_likes_per_post || post.net_votes + 5 >= average_likes_per_post;
                                      const votesMoreThanAverage = post.net_votes > average_likes_per_post;

                                      const payoutDetails = calculatePayout(post);
                                      const totalGenerating = categoryStats.average_paid_authors + categoryStats.average_paid_curators;
                                      const suggestions = [];
                                      const achievements = [];

                                      let vote = 0;

                                      // we love devs
                                      if (post.json_metadata.type === 'development') {
                                        vote = vote + 30;
                                        achievements.push('I am a bot...I love developers... <3');
                                      }

                                      // POSITIVE VOTES
                                      if (tagsInAverage || tagsMoreThanAverage) vote++;


                                      if(bodyInAverage) {
                                        vote = vote + 10;
                                        achievements.push('Good amount of information. Thank you!');
                                      };
                                      if (bodyBiggerThanAverage) {
                                        // length of the body bigger than average in its category. The contribution is informative
                                        if (bodyLength - 1500 > average_posts_length) {
                                          vote = vote + 5;
                                        }
                                        if (bodyLength - 3000 > average_posts_length) {
                                          vote = vote + 5;
                                        }
                                        if (bodyLength - 5000 > average_posts_length) {
                                          vote = vote + 5;
                                        }
                                        achievements.push('A very informative contribution. Good job!');
                                      };

                                      if (votesInAverage) {
                                        vote = vote + 10;
                                        achievements.push('Votes on this contribution are going well. Nice!');
                                      }
                                      if (votesMoreThanAverage) {
                                        // the contribution is having more than average votes
                                        vote = vote + 5;

                                        if (post.net_votes - 5 > average_likes_per_post) {
                                          vote = vote + 5;
                                        }
                                        if (post.net_votes - 15 > average_likes_per_post) {
                                          vote = vote + 5;
                                        }
                                        if (post.net_votes - 30 > average_likes_per_post) {
                                          vote = vote + 5;
                                        }
                                        achievements.push('You are having more votes than average for this category. Nice!');
                                      };


                                      if (post.net_votes > followers.follower_count && follower_count > 0) {
                                        // giving a tip for account swith small followers or 0
                                        vote = vote + 10;
                                        achievements.push('You just got more votes than your total number of followers. Rock Star!');
                                      }
                                      if (post.net_votes > followers.follower_count / 4 && followers.follower_count > 100) {
                                        // the post is voted by many considering the total number of followers
                                        vote = vote + 5;

                                        if (post.net_votes > followers.follower_count / 3 && followers.follower_count > 100) {
                                          vote = vote + 5;
                                        }
                                        if (post.net_votes > followers.follower_count / 2 && followers.follower_count > 100) {
                                          vote = vote + 5;
                                        }
                                        achievements.push('This contribution is performing very well based on the number of your followers. Kudos!');
                                      }

                                      if (payoutDetails.potentialPayout > totalGenerating) {
                                        // the contribution is generating big payouts
                                        vote = vote + 20;
                                        if (payoutDetails.potentialPayout - 10 > totalGenerating) {
                                          vote = vote + 5;
                                        }
                                        if (payoutDetails.potentialPayout - 25 > totalGenerating) {
                                          vote = vote + 5;
                                        }
                                        if (payoutDetails.potentialPayout - 50 > totalGenerating) {
                                          vote = vote + 10;
                                        }
                                        if (payoutDetails.potentialPayout - 100 > totalGenerating) {
                                          vote = vote + 20;
                                        }
                                        achievements.push('You are generating more rewards than average for this category. Super!');
                                      }

                                      // reputation of the user
                                      if(reputation > 25) vote++;
                                      if(reputation >= 35) vote++;
                                      if(reputation >= 50) vote++;
                                      if(reputation >= 70) vote++;
                                      if(reputation >= 80) vote++;

                                      // rewards for posting
                                      if (posting_rewards > 10000) vote++;
                                      if (posting_rewards > 500000) vote++;
                                      if (posting_rewards > 1000000) vote++;
                                      if (posting_rewards > 10000000) vote++;
                                      if (posting_rewards > 100000000) vote++;

                                      // rewards for curating. More important than posting
                                      if (curation_rewards > 10000) vote++;
                                      if (curation_rewards > 50000) vote++;
                                      if (curation_rewards > 100000) vote++;
                                      if (curation_rewards > 1000000) vote++;
                                      if (curation_rewards > 10000000) vote++;

                                      if (contributionsCount === 0) {
                                        // this is the first contribution of the user accepted in the Utopian feed
                                        // give the user a little gift
                                        vote = vote + 15;
                                        achievements.push('This is your first accepted contribution here in Utopian. Welcome!');
                                      }

                                      // number of contributions in total
                                      if (contributionsCount >= 3) {
                                        // git for being productive
                                        vote = vote + 10;
                                        if (contributionsCount >= 10) {
                                          // git for being productive
                                          vote = vote + 5;
                                        }
                                        if (contributionsCount >= 30) {
                                          // git for being productive
                                          vote = vote + 15;
                                        }
                                        if (contributionsCount >= 50) {
                                          // git for being productive
                                          vote = vote + 20;
                                        }
                                        achievements.push('Seems like you contribute quite often. AMAZING!');
                                      }


                                      // average of votes this user has on all his contributions
                                      if (contributionsTotalVotesAverage > 15) {
                                        vote = vote + 15;

                                        if (contributionsTotalVotesAverage > 35) {
                                          vote = vote + 5;
                                        }
                                        if (contributionsTotalVotesAverage > 50) {
                                          vote = vote + 10;
                                        }
                                        if (contributionsTotalVotesAverage > 100) {
                                          vote = vote + 30;
                                        }

                                        achievements.push('You have a good amount of votes on your contributions. Good job!');
                                      }

                                      if (contributionsTotalVotesAverage > categoryStats.average_likes_per_post) {
                                        // the user has more votes than average on his contributions in total
                                        vote = vote + 20;
                                        achievements.push('In total you have more votes than average for this category. Bravo!');
                                      }

                                      if (achievements.length >= 5) {
                                        // WOW a lot of achievements. Better to give a gift
                                        vote = vote + 20;
                                        achievements.push('You have just unlocked 5 achievements. Yeah!');
                                      }

                                      // NEGATIVE VOTES
                                      if(reputation < 25) vote--;
                                      if(reputation < 15) vote--;
                                      if(reputation < 5) vote--;
                                      if(reputation < 0) vote--;

                                      if (tagsLessThanAverage) vote--;
                                      if (linksLessThanAverage) vote--;

                                      if (bodyLessThanAverage) {
                                        if(average_posts_length - bodyLength > 1000) {
                                          vote--;
                                        }
                                        if(average_posts_length - bodyLength > 3000) {
                                          vote = vote - 5;
                                        }
                                        if(average_posts_length - bodyLength > 7000) {
                                          vote = vote - 5;
                                        }
                                        if(average_posts_length - bodyLength > 10000) {
                                          vote = vote - 5;
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
                                      if(vote < 0) vote = 1;
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

                                      setTimeout(function() {
                                        console.log("-----VOTING AUTHOR-------", post.author);
                                        console.log("VOTING PERMLINK", post.permlink);
                                        console.log("VOTING VOTE", vote);

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

                                      }, allPostsIndex === 0 || 30000 * allPostsIndex);

                                    });
                                });
                            });
                          }
                        }
                      });
                    });
                  } else {
                    console.log("NO POSTS");
                    conn.close();
                    process.exit(0);
                  }
                });
            });
        }
      });
    });
});
