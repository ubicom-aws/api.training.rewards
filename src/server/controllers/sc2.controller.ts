import * as HttpStatus from 'http-status';
import Session from '../models/session.model';
import * as express from 'express';
import * as sc2 from '../sc2';

export async function profile(req: express.Request,
                              res: express.Response,
                              next: express.NextFunction) {
  try {
    const json = await sc2.send('/me', {
      user: res.locals.user
    });
    if (!json) {
      return res.sendStatus(HttpStatus.UNAUTHORIZED);
    }

    return res.json(json);
  } catch (e) {
    next(e);
  }
}

export async function updateProfile(req: express.Request,
                                    res: express.Response,
                                    next: express.NextFunction) {
  try {
    const json = await sc2.send('/me', {
      user: res.locals.user,
      method: 'PUT',
      data: req.body
    });
    return res.json(json);
  } catch (e) {
    next(e);
  }
}

export async function broadcast(req: express.Request,
                                res: express.Response,
                                next: express.NextFunction) {
  try {
    const json = await sc2.send('/broadcast', {
      user: res.locals.user,
      data: req.body
    });
    return res.json(json);
  } catch (e) {
    next(e);
  }
}
