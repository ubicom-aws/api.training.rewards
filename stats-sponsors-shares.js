import Sponsor from './server/models/sponsor.model';
import Stats from './server/models/stats.model';

import config from './config/config';
import steemApi from './server/steemAPI';

import * as R from 'ramda';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  const dedicatedPercentageSponsors = 20;

  Sponsor.listAll()
    .then(sponsors => {
      if (sponsors.length > 0) {
        let total_vesting_shares = 0;

        sponsors.forEach(sponsor => total_vesting_shares = total_vesting_shares + sponsor.vesting_shares);

        sponsors.forEach((sponsor, index) => {
          steemApi.getVestingDelegations(sponsor.account, -1, 1000, function(err, delegations) {

            Stats.get()
              .then(stats => {
                const isDelegating = R.find(R.propEq('delegatee', 'utopian-io'))(delegations);

                if (isDelegating) {
                  const currentVestingShares = parseInt(isDelegating.vesting_shares);
                  const percentageTotalShares = (currentVestingShares / total_vesting_shares) * 100;
                  const total_paid_authors = stats.total_paid_authors;
                  const totalDedicatedSponsors = (total_paid_authors * dedicatedPercentageSponsors) / 100;
                  const shouldHaveReceivedRewards = (percentageTotalShares * totalDedicatedSponsors) / 100;
                  const total_paid_rewards = sponsor.total_paid_rewards;

                  if (shouldHaveReceivedRewards > total_paid_rewards) {
                    const mustReceiveRewards = shouldHaveReceivedRewards - total_paid_rewards;
                    sponsor.should_receive_rewards = mustReceiveRewards;
                  }

                  if (shouldHaveReceivedRewards < total_paid_rewards) {
                    const waitForNextRewards = 0;
                    sponsor.should_receive_rewards = waitForNextRewards;
                  }

                  sponsor.vesting_shares = currentVestingShares;
                  sponsor.percentage_total_vesting_shares = percentageTotalShares;

                } else {
                  sponsor.vesting_shares = 0;
                  sponsor.percentage_total_vesting_shares = 0;
                }

                sponsor.save(savedSponsor => {
                  if ((index + 1) === sponsors.length) {
                    process.exit(0);
                  }
                });
              });
          });
        })
      }
    });
});
