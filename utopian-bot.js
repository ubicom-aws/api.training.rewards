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


  function checkVotingPower (callback) {
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

  const now = new Date();
  var post_vote = [];
  const MIN_VOTE_QUAL = 20;
  const MAX_INFLATION = 1.5;
  const VOTE_THRESHOLD = 7;
  const MAX_VOTE=60;
  const category_pools=[{"cat":"development","max_vote":400,"min_single_vote":6},{"cat":"bug-hunting","max_vote":75,"min_single_vote":2},{"cat":"ideas","max_vote":50,"min_single_vote":1},{"cat":"translations","max_vote":150,"min_single_vote":3},{"cat":"others","max_vote":325,"min_single_vote":3}];
  var processed_posts=[];
  const query = {
    reviewed: true,
    'active_votes.voter': { $ne: botAccount },
    created: {
      $lte: new Date(now.getTime() - 4*60*60*1000).toISOString()
    },
    cashout_time: {
      $gt: paidRewardsDate,
    },
  };
  function sortContributions(){
    //console.log('---------LOOP OVER------------\n',post_vote);

    // Keep only posts fresher than 6 days
    post_vote = post_vote.filter(function(elt){return (Date.now()-new Date(elt.created)- new Date().getTimezoneOffset())<1000*3600*24*6});

    // Put blogs and ideas in low qual content
    post_vote.forEach(function(elt){if(elt.category==='blog'||elt.category==='ideas')elt.vote=Math.min(MIN_VOTE_QUAL-0.1,elt.vote);});

    // Separate High and Low quality content
    var high_qual_post=post_vote.filter(function(elt){return elt.vote>=MIN_VOTE_QUAL;});
    var low_qual_post=post_vote.filter(function(elt){return elt.vote<MIN_VOTE_QUAL;});
    var total_vote_high = 0;

    // High quality content get voted accorded to the ratio in their pool
    category_pools.forEach(function(elt){
      const this_cat_post = high_qual_post.filter(function(e){return e.category===elt.cat;});
      console.log(elt.cat, this_cat_post.length);
      var total_cat_vote=0;
      this_cat_post.forEach(function(post){total_cat_vote+=post.vote;});
      var ratio=total_cat_vote/elt.max_vote;
      if(ratio<1/MAX_INFLATION)
        ratio=1/MAX_INFLATION;
      console.log('Desired total vote:',total_cat_vote,'Max vote',elt.max_vote,'Ratio',ratio);
      high_qual_post.forEach(function(post){if(post.category===elt.cat){const real_vote=Math.max(Math.min(Math.round(post.vote/ratio),MAX_VOTE),VOTE_THRESHOLD+2);post.real_vote=real_vote;total_vote_high+=real_vote;}});
    });

    // Low quality content shares unused voting power plus one full vote
    console.log('High Quality:',high_qual_post.length,'Low quality:',low_qual_post.length);
    const unused_vp=Math.max(0,1000-total_vote_high);
    console.log('Voting Power for High Quality:',total_vote_high,'Unused VP:',unused_vp);
    const low_qual_post_vote=Math.max(Math.min(VOTE_THRESHOLD,Math.round((unused_vp+100)/low_qual_post.length)));

    // Applying a lower bound to each category in the low quality array

    console.log(low_qual_post.length,'low quality posts will be voted at',low_qual_post_vote,'or less');
    var low_qual_vp=0;
    low_qual_post.forEach(function(post){
      var cat=category_pools.find(function(c){return c.cat===post.category;});
      post.real_vote=Math.max((low_qual_post_vote*post.vote/MIN_VOTE_QUAL).toFixed(1),cat.min_single_vote);
      low_qual_vp+=post.real_vote;});
    processed_posts.push.apply(processed_posts,high_qual_post.concat(low_qual_post));
    console.log("Total used voting power:",total_vote_high+low_qual_vp);


    processed_posts.forEach(function(post, i){
      setTimeout(function() {

        const jsonMetadata = { tags: ['utopian-io'], community: 'utopian', app: `utopian/1.0.0` };
        let commentBody = '';

        commentBody = `### Hey @${post.author} I am @${botAccount}. I have just super-voted you at ${post.real_vote}% Power!\n`;


        if (post.suggestions.length > 0) {
          commentBody += '#### Suggestions https://utopian.io/rules\n';
          post.suggestions.forEach(suggestion => commentBody += `- ${suggestion}\n`);
        }

        if (post.achievements.length > 0) {
          commentBody += '#### Achievements\n';
          post.achievements.forEach(achievement => commentBody += `- ${achievement}\n`);
        }

        commentBody += '**Up-vote this comment to grow my power and help Open Source contributions like this one. Want to chat? Join me on Discord https://discord.gg/Pc8HG9x**';


        console.log('--------------------------------------\n');
        console.log('https://utopian.io/utopian-io/@'+post.author+'/'+post.permlink+'\n',post.category);
        console.log('VOTE:' + post.real_vote * 100 + '\n');
        console.log(commentBody);
        console.log('--------------------------------------\n');
        ///*
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
            if (i + 1 === posts.length) {
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

        SteemConnect.vote(botAccount, post.author, post.permlink, post.real_vote * 100)
          .then(() => {
            console.log("NOW SUBMITTING COMMENT FROM THEN");
            comment();
          }).catch(e => {
          // I think there is a problem with sdk. Always gets in the catch
          if (e.error_description == undefined) {
            console.log("NOW SUBMITTING COMMENT FROM CATCH");
            comment();
          }
        });

      }, i === 0 || 30000 * i);
    });
  }
  ///*
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
      //*/
      checkVotingPower(function(){
        Stats.get()
          .then(stats => {
            const { categories } = stats;
            Post
              .countAll({ query })
              .then(limit => {
                Post
                  .list({ skip: 0, limit: limit, query, sort: { net_votes: -1 } })
                  .then(posts => {

                    if(!posts.length) {
                      console.log("NO POSTS");
                      conn.close();
                      process.exit(0);
                      return;
                    }

                    console.log("FOUND POSTS TO VOTE: ", limit);
                    var i = 0;

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
                                        'libertyteeth',
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
                                        'pharesim',
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
                                        vote = vote + 20;
                                        achievements.push('I am a bot...I love developers... <3');
                                      }
                                      if (post.json_metadata.type === 'sub-projects') {
                                        vote = vote + 20;
                                        achievements.push('Wow, ready to change the world with this project?');
                                      }
                                      if (post.json_metadata.type === 'bug-hunting') {
                                        vote = vote + 3;
                                        achievements.push('I am a bot...I need someone spotting my bugs!');
                                      }

                                      if (post.json_metadata.type === 'translations') {
                                        vote = vote + 7;
                                        achievements.push('You are helping this project go global! Appreciated!');
                                      }

                                      if (post.json_metadata.type === 'graphics') {
                                        vote = vote + 7;
                                        achievements.push('Creativity makes the World a better place. Thanks!');
                                      }
                                      if (post.json_metadata.type === 'tutorials') {
                                        vote = vote + 7;
                                        achievements.push('Thanks for explaining to me how it works! Beep beep!');
                                      }
                                      if (post.json_metadata.type === 'video-tutorials') {
                                        vote = vote + 10;
                                        achievements.push('Nice video tutorial! I am always lazy to read!');
                                      }
                                      if (post.json_metadata.type === 'copywriting') {
                                        vote = vote + 7;
                                        achievements.push('Good contents make happier readers. Thanks!');
                                      }

                                      if (post.json_metadata.type === 'analysis') {
                                        vote = vote + 7;
                                        achievements.push('Oh I love when we talk about data!');
                                      }
                                      /** END Adding fixed voting weights for categories where actual work is required */


                                      // POSITIVE VOTES
                                      if (tagsInAverage || tagsMoreThanAverage) vote++;

                                      if(bodyInAverage) {
                                        vote = vote + 2.5;
                                      };
                                      if (bodyBiggerThanAverage) {
                                        // length of the body bigger than average in its category. The contribution is informative
                                        if (bodyLength - 4000 > average_posts_length) {
                                          vote = vote + 2.5;
                                        }
                                        if (bodyLength - 8000 > average_posts_length) {
                                          vote = vote + 2.5;
                                        }
                                        if (bodyLength - 16000 > average_posts_length) {
                                          vote = vote + 5;
                                        }
                                        achievements.push('Much more informative than others in this category. Good job!');
                                      };

                                      if (votesInAverage) {
                                        vote++;
                                        achievements.push('Votes on this contribution are going well. Nice!');
                                      }
                                      if (votesMoreThanAverage) {
                                        // the contribution is having more than average votes
                                        vote = vote++;

                                        if (post.net_votes - 20 > average_likes_per_post) {
                                          vote = vote + 2.5;
                                        }
                                        if (post.net_votes - 40 > average_likes_per_post) {
                                          vote = vote + 2.5;
                                        }
                                        if (post.net_votes - 80 > average_likes_per_post) {
                                          vote = vote + 5;
                                        }
                                        achievements.push('You are having more votes than average for this category. Nice!');
                                      };

                                      if(followers.follower_count < 500) {
                                        vote = vote + 5;
                                        achievements.push('You have less than 500 followers. Just gave you a gift ;)');
                                      }

                                      if (post.net_votes > followers.follower_count && followers.follower_count > 0) {
                                        // giving a tip for account swith small followers or 0
                                        vote = vote + 5;
                                        achievements.push('You just got more votes than your total number of followers. Rock Star!');
                                      }

                                      if (payoutDetails.potentialPayout > totalGenerating) {
                                        // the contribution is generating big payouts
                                        vote = vote + 5;

                                        if (payoutDetails.potentialPayout - 20 > totalGenerating) {
                                          vote = vote + 5;
                                        }
                                        if (payoutDetails.potentialPayout - 40 > totalGenerating) {
                                          vote = vote + 5;
                                        }
                                        if (payoutDetails.potentialPayout - 80 > totalGenerating) {
                                          vote = vote + 5;
                                        }
                                        if (payoutDetails.potentialPayout - 150 > totalGenerating) {
                                          vote = vote + 10;
                                        }
                                        achievements.push('You are generating more rewards than average for this category. Super!');
                                      }

                                      // reputation of the user
                                      if(reputation > 25) vote++;
                                      if(reputation >= 35) vote++;
                                      if(reputation >= 50) vote++;
                                      if(reputation >= 60) vote++;
                                      if(reputation >= 70) vote++;

                                      if (contributionsCount === 0) {
                                        // this is the first contribution of the user accepted in the Utopian feed
                                        // give the user a little gift
                                        vote = vote + 10;
                                        achievements.push('This is your first accepted contribution here in Utopian. Welcome!');
                                      }

                                      // number of contributions in total
                                      if (contributionsCount >= 5) {
                                        // git for being productive
                                        vote = vote++;

                                        if (contributionsCount >= 15) {
                                          // git for being productive
                                          vote = vote + 2.5;
                                        }
                                        if (contributionsCount >= 30) {
                                          // git for being productive
                                          vote = vote + 5;
                                        }
                                        achievements.push('Seems like you contribute quite often. AMAZING!');
                                      }

                                      // average of votes this user has on all his contributions
                                      if (contributionsTotalVotesAverage > 30) {
                                        vote = vote + 5;

                                        if (contributionsTotalVotesAverage > 60) {
                                          vote = vote + 5;
                                        }
                                        if (contributionsTotalVotesAverage > 120) {
                                          vote = vote + 5;
                                        }
                                        if (contributionsTotalVotesAverage > 300) {
                                          vote = vote + 10;
                                        }

                                        achievements.push('You have a good amount of votes on your contributions. Good job!');
                                      }

                                      if (contributionsTotalVotesAverage > categoryStats.average_likes_per_post) {
                                        // the user has more votes than average on his contributions in total
                                        vote = vote + 5;
                                        achievements.push('In total you have more votes than average for this category. Bravo!');
                                      }

                                      if (achievements.length > 5) {
                                        // WOW a lot of achievements. Better to give a gift
                                        vote = vote + 5;
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
                                          vote = vote - 2.5;
                                        }
                                        if(average_posts_length - bodyLength > 8000) {
                                          vote = vote - 5;
                                        }
                                        if(average_posts_length - bodyLength > 16000) {
                                          vote = vote - 5;
                                        }
                                        if(average_posts_length - bodyLength > 30000) {
                                          vote = vote - 10;
                                        }
                                        suggestions.push('Your contribution is less informative than others in this category.');
                                      }

                                      let foundBots = 0;
                                      post.active_votes.forEach((voted, index) => {
                                        if (bots.indexOf(voted.voter) > - 1) {
                                          foundBots++;
                                        }
                                      });
                                      if (foundBots > 0) {
                                        vote = vote - 2.5;

                                        if (foundBots > 4) {
                                          vote = vote - 2.5;
                                        }

                                        if (foundBots > 8) {
                                          vote = vote - 5;
                                        }

                                        if (foundBots > 12) {
                                          vote = vote - 10;
                                        }

                                        suggestions.push('Utopian has detected ' + foundBots + ' bot votes. I am the only bot you should love!!');
                                      }

                                      vote = Math.round(vote);
                                      if(vote <= 0) vote = 1;
                                      if(vote > 60) vote = 60;



                                      var cat = post.json_metadata.type.replace('task-', ''); //put announcements with their corresponding category

                                      if(cat === 'graphics' || cat === 'documentation' || cat === 'analysis' || cat ==='social'|| cat ==='tutorials'|| cat ==='video-tutorials'|| cat ==='copywriting' ) {
                                        cat = 'others'; //regroups the categories with low amount of contributions
                                      }
                                      if(cat === 'blog')
                                        cat = 'ideas';
                                      if(cat ==='sub-projects')
                                        cat='development';

                                      post_vote.push({"author": post.author, "permlink": post.permlink, "vote": vote, "category": cat, "achievements": achievements, "suggestions": suggestions,"created": post.created});
                                      console.log(i);
                                      if(i + 1 === posts.length)
                                        sortContributions();
                                      else i++;
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
});
