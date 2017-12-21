import Session from '../models/session.model';
import * as HttpStatus from 'http-status';
import * as request from 'superagent';
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
    if (req.body.operations) {
      const ops: any[][] = req.body.operations;
      for (const op of ops) {
        if (op[0] !== 'comment') {
          continue;
        }
        const data = op[1];
        if (!data.json_metadata || data.parent_author || data.parent_permlink) {
          continue;
        }
        const meta = JSON.parse(data.json_metadata);
        if (meta.repository && meta.repository.full_name) {
          let repo = meta.repository;
          if (!repo.id) {
            repo = await getGithubRepo(repo.full_name);
          }
          meta.repository = {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            fork: repo.fork
          };
        }
        data.json_metadata = JSON.stringify(meta);
      }
    }

    const json = await sc2.send('/broadcast', {
      user: res.locals.user,
      data: req.body
    });
    return res.json(json);
  } catch (e) {
    next(e);
  }
}

function getGithubRepo(name: string) {
  return request.get(`https://api.github.com/repos/${name.toLowerCase()}`);
}
