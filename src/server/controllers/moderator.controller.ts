import Moderator from '../models/moderator.model';

function list(req, res, next) {
  Moderator.list()
    .then(moderators => res.json({
      total: moderators.length,
      results: moderators
    }))
    .catch(e => next(e));
}

function listBeneficiaries(req, res, next) {
  Moderator.listBeneficiaries()
    .then(moderators => res.json({
      total: moderators.length,
      results: moderators
    }))
    .catch(e => next(e));
}

export default { list, listBeneficiaries };
