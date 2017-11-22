import Moderator from '../models/moderator.model';
import Sponsor from '../models/sponsor.model';
import * as R from 'ramda';

function list(req, res, next) {
  const { exclude } = req.query;
  Sponsor.listBeneficiaries([exclude])
    .then(sponsors => {
      const sponsorsToExclude = R.pluck('account')(sponsors);
      Moderator.listBeneficiaries([...sponsorsToExclude, exclude])
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
