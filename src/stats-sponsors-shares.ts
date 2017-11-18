import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import * as R from 'ramda';
import Sponsor from './server/models/sponsor.model';
import Stats from './server/models/stats.model';
import Post from './server/models/post.model';
import config from './config/config';
import steemApi from './server/steemAPI';
import { calculatePayout } from './server/steemitHelpers';


mongoose.Promise = Promise;
mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  Stats.get()
    .then(stats => {
      // @TODO should be used to increment the stats based on last check, instead then rechecking from the start
      const lastCheck = stats.stats_sponsors_shares_last_check;
      const paidRewardsDate = '1969-12-31T23:59:59';
      const now = new Date().toISOString();
      const dedicatedPercentageSponsors = 20;

      Sponsor.listAll()
        .then(sponsors => {
          if (sponsors.length > 0) {
            let total_vesting_shares = 0;

            sponsors.forEach(sponsor => total_vesting_shares = total_vesting_shares + sponsor.vesting_shares);

            sponsors.forEach((sponsor, sponsorsIndex) => {
              setTimeout(function(){
                steemApi.getVestingDelegations(sponsor.account, -1, 1000, function(err, delegations) {
                  const isDelegating = R.find(R.propEq('delegatee', 'utopian-io'))(delegations);

                  if (isDelegating) {
                    const delegationDate = isDelegating.min_delegation_time;
                    const query = {
                      created:
                        {
                          $gte: delegationDate
                        },
                      cashout_time:
                        {
                          $eq: paidRewardsDate
                        },
                    };

                    Post
                      .countAll({ query })
                      .then(count => {
                        Post
                          .list({skip: 0, limit: count, query})
                          .then(posts => {
                            const currentVestingShares = parseInt(isDelegating.vesting_shares);
                            const percentageTotalShares = (currentVestingShares / total_vesting_shares) * 100;
                            let total_paid_authors = stats.total_paid_authors;

                            posts.forEach(post => {
                              const payoutDetails = calculatePayout(post);
                              total_paid_authors = total_paid_authors + (payoutDetails.authorPayouts || 0);
                            });

                            const totalDedicatedSponsors = (total_paid_authors * dedicatedPercentageSponsors) / 100;
                            const shouldHaveReceivedRewards = (percentageTotalShares * totalDedicatedSponsors) / 100;
                            const total_paid_rewards = sponsor.total_paid_rewards;

                            if (shouldHaveReceivedRewards >= total_paid_rewards) {
                              const mustReceiveRewards = shouldHaveReceivedRewards - total_paid_rewards;
                              sponsor.should_receive_rewards = mustReceiveRewards;
                            }

                            if (shouldHaveReceivedRewards <= total_paid_rewards) {
                              const waitForNextRewards = 0;
                              sponsor.should_receive_rewards = waitForNextRewards;
                            }

                            sponsor.vesting_shares = currentVestingShares;
                            sponsor.percentage_total_vesting_shares = percentageTotalShares;

                            sponsor.save(savedSponsor => {
                              if ((sponsorsIndex + 1) === sponsors.length) {
                                stats.stats_sponsors_shares_last_check = now;
                                stats.save().then(() => {
                                  conn.close();
                                  process.exit(0);
                                });
                              }
                            });
                          });
                      });
                  } else {
                    sponsor.vesting_shares = 0;
                    sponsor.percentage_total_vesting_shares = 0;

                    sponsor.save(savedSponsor => {
                      if ((sponsorsIndex + 1) === sponsors.length) {
                        stats.stats_sponsors_shares_last_check = now;
                        stats.save().then(() => {
                          conn.close();
                          process.exit(0);
                        });
                      }
                    });
                  }
                });
              }, sponsorsIndex * 3000);
            })
          }
        });
    }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});
