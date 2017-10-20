import Moderator from '../models/moderator.model';
import Sponsor from '../models/sponsor.model';
import * as R from 'ramda';

function list(req, res, next) {
  Sponsor.listBeneficiaries()
    .then(sponsors => {
      Moderator.listBeneficiaries(R.pluck('account')(sponsors))
        .then(moderators => res.json({
          total: moderators.length + sponsors.length,
          results: [
            ...sponsors,
            ...moderators
          ]
        }))
        .catch(e => next(e));
    })
    .catch(e => next(e));
}

export default { list };
