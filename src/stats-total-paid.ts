import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import Post from './server/models/post.model';
import Stats from './server/models/stats.model';
import { calculatePayout } from './server/steemitHelpers';
import config from './config/config';

(mongoose as any).Promise = Promise;
mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  Stats.get().then(stats => {
    // @TODO should be used to increment the stats based on last check, instead then rechecking from the start
    const lastCheck = stats.stats_total_paid_last_check;
    const now = new Date().toISOString();
    const paidRewardsDate = '1969-12-31T23:59:59';
    const query = {
      cashout_time:
        {
          $eq: paidRewardsDate
        },
    };

    Post
      .countAll({ query })
      .then(count => {
        Post
          .list({ skip: 0, limit: count, query })
          .then(posts => {
            if(posts.length > 0) {
              let total_paid_rewards = 0;
              let total_paid_authors = 0;
              let total_paid_curators = 0;

              posts.forEach((post, index) => {
                const payoutDetails = calculatePayout(post);
                const authorPayouts = payoutDetails.authorPayouts || 0;
                const curatorPayouts = payoutDetails.curatorPayouts || 0;
                const sumPayouts = authorPayouts + curatorPayouts;

                total_paid_rewards = total_paid_rewards + sumPayouts;
                total_paid_authors = total_paid_authors + authorPayouts;
                total_paid_curators = total_paid_curators + curatorPayouts;
              });

              stats.total_paid_rewards = total_paid_rewards;
              stats.total_paid_authors = total_paid_authors;
              stats.total_paid_curators = total_paid_curators;
              stats.stats_total_paid_last_check = now;

              stats.save().then(savedStats => {
                conn.close();
                process.exit(0);
              })
            }
          });
      });
  }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});
