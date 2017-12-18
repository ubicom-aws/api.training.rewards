import Moderator from '../models/moderator.model';
import Session from '../models/session.model';
import * as HttpStatus from 'http-status';
import * as express from 'express';

export interface RateLimit {
  lastHit: number;
  reset: Function;
}

export type BypassCheck = (req: express.Request,
                            res: express.Response,
                            next: express.NextFunction) => boolean;

export function rateLimit(minWaitTime = 60000, bypassCheck?: BypassCheck) {
  const users: {[account: string]: RateLimit} = {};
  return (req: express.Request,
          res: express.Response,
          next: express.NextFunction) => {
    if (!res.locals.user) {
      return res.sendStatus(HttpStatus.UNAUTHORIZED);
    }

    let user = users[res.locals.user.account];
    if (!user) {
      user = users[res.locals.user.account] = {
        lastHit: 0,
        reset: () => {
          user.lastHit = 0;
        }
      };
    }
    res.locals.rateLimit = user;
    if (bypassCheck && bypassCheck(req, res, next)) {
      return;
    }

    const now = Date.now();
    if ((now - user.lastHit) <= minWaitTime) {
      res.status(HttpStatus.TOO_MANY_REQUESTS);
      return res.json({
        try_again: Math.round((minWaitTime - (now - user.lastHit)) / 1000)
      });
    }
    user.lastHit = now;
    next();
  };
}

export function requireAuth(req: express.Request,
                            res: express.Response,
                            next: express.NextFunction) {
  const session = req.cookies.session || req.headers.session;
  if (!session) {
    return res.sendStatus(HttpStatus.UNAUTHORIZED);
  }
  Session.get(session).then(user => {
    if (!user) {
      res.sendStatus(HttpStatus.UNAUTHORIZED);
      return undefined;
    }
    return user.updateSC2Token();
  }).then(user => {
    if (!user) {
      return;
    } else if (!user.sc2) {
      return res.sendStatus(HttpStatus.PROXY_AUTHENTICATION_REQUIRED);
    }
    res.locals.session = session;
    res.locals.user = user;
    next();
  }).catch(err => next(err));
}

export function requireMod(req: express.Request,
                            res: express.Response,
                            next: express.NextFunction) {
  const user = res.locals.user;
  if (!user) {
    return next();
  }
  Moderator.findOne({ account: user.account }).then((mod: any) => {
    if (!mod || mod.banned) {
      return res.sendStatus(HttpStatus.FORBIDDEN);
    }
    res.locals.moderator = mod;
    next();
  }).catch(err => next(err));
}
