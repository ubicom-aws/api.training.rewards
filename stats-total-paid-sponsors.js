import Post from './server/models/post.model';
import Sponsor from './server/models/sponsor.model';
import { calculatePayout } from './server/steemitHelpers';

import * as R from 'ramda';

import config from './config/config';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{

  const paidRewardsDate = '1969-12-31T23:59:59';

  Sponsor.list()
    .then(sponsors => {
      if (sponsors.length > 0) {
        sponsors.forEach((sponsor, index) => {
          setTimeout(function() {

            const query = {
              beneficiaries: {
                $elemMatch: {
                  account: sponsor.account,
                }
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
                  .list({ skip: 0, limit: count, query })
                  .then(posts => {
                    let total_paid_rewards = 0;

                    if(posts.length > 0) {
                      posts.forEach(post => {
                        const beneficiary = R.find(R.propEq('account', sponsor.account))(post.beneficiaries) || {weight: 0};
                        const payoutDetails = calculatePayout(post);
                        const authorPayouts = payoutDetails.authorPayouts || 0;
                        const payoutSponsor = (authorPayouts * (parseInt(beneficiary.weight) / 100)) / 100;

                        total_paid_rewards = total_paid_rewards + payoutSponsor;
                      });
                    }

                    console.log(sponsor.account)
                    console.log(total_paid_rewards)

                    sponsor.total_paid_rewards = total_paid_rewards;

                    sponsor.save().then(savedSponsor => {
                      if ((index + 1) === sponsors.length) {
                        conn.close();
                        process.exit(0);
                      }
                    });
                  })
              });
          }, index * 3000);

        });
      }
    });
});
