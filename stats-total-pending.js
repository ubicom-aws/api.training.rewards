import Post from './server/models/post.model';
import Stats from './server/models/stats.model';
import { calculatePayout } from './server/steemitHelpers';

import config from './config/config';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  const paidRewardsDate = '1969-12-31T23:59:59';
  const query = {
    cashout_time:
      {
        $gt: paidRewardsDate
      },
  };

  Post
    .countAll({ query })
    .then(count => {
      Post
        .list({ skip: 0, limit: count, query })
        .then(posts => {
          if(posts.length > 0) {
            Stats.get().then(stats => {
              let total_pending_rewards = 0;

              posts.forEach((post, index) => {
                const payoutDetails = calculatePayout(post);
                total_pending_rewards = total_pending_rewards + payoutDetails.potentialPayout;
              });

              stats.total_pending_rewards = total_pending_rewards;
              stats.save().then(savedStats => {
                conn.close();
                process.exit(0);
              });
            });
          }
        })
    })
});
