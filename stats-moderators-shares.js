import Moderator from './server/models/moderator.model';
import Stats from './server/models/stats.model';
import Post from './server/models/post.model';

import config from './config/config';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  const dedicatedPercentageModerators = 5;
  const paidRewardsDate = '1969-12-31T23:59:59';
  const query = {
    cashout_time: paidRewardsDate,
    reviewed: true,
    moderator: {
      $exists : true
    }
  };

  Post
    .countAll({ query })
    .then(countPaidPosts => {
      Post
        .list({ skip: 0, limit: countPaidPosts, query })
        .then(posts => {
          if(posts.length > 0) {
            posts.forEach((post, indexPost) => {
                Moderator.get(post.moderator).then(moderator => {
                  let moderatorObj = moderator;
                  if (!moderator) {
                    moderatorObj = new Moderator({
                      account: post.moderator,
                      total_paid_rewards: 0,
                      should_receive_rewards: 0,
                      total_moderated: 1,
                      percentage_total_rewards_moderators: 0,
                    })
                  }

                  console.log("MODERATOR", moderatorObj.account);

                  const queryTotalModerated = {
                    cashout_time: paidRewardsDate,
                    moderator: moderatorObj.account,
                    reviewed: true,
                  };

                  Post
                    .countAll({ query: queryTotalModerated })
                    .then(currentModerated => {
                      Stats.get()
                        .then(stats => {
                          console.log("TOTAL MOD", currentModerated);
                          const percentageTotalShares = (currentModerated / countPaidPosts) * 100;
                          const total_paid_authors = stats.total_paid_authors;
                          const totalDedicatedModerators = (total_paid_authors * dedicatedPercentageModerators) / 100;
                          const shouldHaveReceivedRewards = (percentageTotalShares * totalDedicatedModerators) / 100;
                          const total_paid_rewards = moderatorObj.total_paid_rewards;

                          if (shouldHaveReceivedRewards > total_paid_rewards) {
                            const mustReceiveRewards = shouldHaveReceivedRewards - total_paid_rewards;
                            moderatorObj.should_receive_rewards = mustReceiveRewards;
                          }

                          if (shouldHaveReceivedRewards < total_paid_rewards) {
                            const waitForNextRewards = 0;
                            moderatorObj.should_receive_rewards = waitForNextRewards;
                          }

                          moderatorObj.total_moderated = currentModerated;
                          moderatorObj.percentage_total_rewards_moderators = percentageTotalShares;

                          moderatorObj.save(savedModerator => {
                            if ((indexPost + 1) === posts.length) {
                              process.exit(0);
                            }
                          });
                        });
                    });
                });
            });
          } else {
            process.exit(0);
          }
        });
    });
});
