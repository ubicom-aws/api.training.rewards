import Moderator from '../models/moderator.model';

function create(req,res,next) {
  const account = req.body.account;
  const banned = false;
  const reviewed = true;
  const supermoderator = false;
  const total_moderated = 0;

  const newMod = new Moderator({
    account: account,
    banned: banned,
    reviewed: reviewed,
    supermoderator: supermoderator,
    total_moderated: total_moderated,
  });
  Moderator.get(account).then((oldMod) => {
    oldMod.banned = banned;
    oldMod.reviewed = reviewed;
    oldMod.supermoderator = supermoderator;
    oldMod.save()
      .then(savedMod => res.json(savedMod))
      .catch(e => {
        console.log("ERROR SAVING OLD MODERATOR", e);
        next(e);
      });
  }).catch(e => {
    console.log("MODERATOR DOESN'T EXIST YET", e);
    newMod.save()
    .then(savedMod => res.json(savedMod))
    .catch(er => {
      console.log("ERROR SAVING NEW MODERATOR", er);
      next(er);
    });
  })
}

function remove(req, res, next) {
  if (!(req.body.account)) {
    return res.status(404);
  }
  Moderator.get(req.body.account)
    .then(moderator => {
        moderator.reviewed = false;
        moderator.banned = true;
        moderator.save()
          .then(savedMod => res.json(savedMod))
          .catch(e => {
            console.log("ERROR SAVING REMOVED MODERATOR", e);
            next(e);
          });
    })
    .catch(e => {
      console.log("ERROR FINDING REMOVED MODERATOR", e);
      next(e);
    });
}

function list(req, res, next) {
  Moderator.list()
    .then(moderators => res.json({
      total: moderators.length,
      results: moderators.filter(mod => !mod.banned)
    }))
    .catch(e => next(e));
}

export default { create, remove, list };
