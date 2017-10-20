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
  const query = {
    reviewed: true,
    moderator: {
      $exists : true
    }
  };

  Post
    .countAll({ query })
    .then(countPosts => {
      Post
        .list({ skip: 0, limit: countPosts, query })
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

                  const queryTotalModerated = {
                    moderator: moderatorObj.account,
                    reviewed: true,
                  };

                  Post
                    .countAll({ query: queryTotalModerated })
                    .then(currentModerated => {
                      Stats.get()
                        .then(stats => {
                          const percentageTotalShares = (currentModerated / countPosts) * 100;
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
