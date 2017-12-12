import * as HttpStatus from 'http-status';
import {getToken} from '../sc2';
import * as express from 'express';
import * as crypto from 'crypto';
import Session from '../models/session.model';
import User, { UserSchemaDoc } from '../models/user.model';
import steemAPI from '../steemAPI';

const ALPHA_NUMERIC = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function genSecureAlphaNumeric(size: number): string {
  const secure = crypto.randomBytes(size);
  const charLen = ALPHA_NUMERIC.length;
  let ascii = '';
  for (const byte of secure) {
    // Range from ASCII
    ascii += ALPHA_NUMERIC[byte % charLen];
  }
  return ascii;
}

async function createUser(account: string) {
  var details = {
    createdBy: 'steem',
    confirmed: false,
    lastUpdate: Date.now,
    connectedToSteem: false,
    votingForWitness: false,
  };

  const user = new User({
    schemaVersion: 1,
    account,
    details
  });

  return new Promise((resolve, reject) => {
    steemAPI.getAccounts([account], (err, accounts) => {
      if (!err) {
        const acct = accounts[0];
        if (acct) {
          if (acct.recovery_account) {
            details.createdBy = acct.recovery_account;
          }
          details.confirmed = true;
          details.connectedToSteem = true;
          if (acct.witness_votes) {
            details.votingForWitness = (acct.witness_votes.indexOf('utopian-io') !== -1);
          }
        }
      }
      resolve(user);
    });
  });

}

export async function steemconnect(req: express.Request,
                                    res: express.Response,
                                    next: express.NextFunction) {
  if (req.cookies.session) {
    return res.status(HttpStatus.OK);
  }
  try {
    const token = await getToken(req.body.code);
    if (!token) return res.status(HttpStatus.UNAUTHORIZED);

    let user: any = await User.findOne({ account: token.username });
    if (!user) user = (await createUser(token.username));

    const session: any = new Session({
      session: genSecureAlphaNumeric(64),
      expiry: new Date(Date.now() + (token.expires_in * 1000)),
      user: user._id
    });

    user.setSC2Token(token);
    await user.save();
    await session.save();

    return res.json({
      session: session.session,
      expiry: session.expiry.getTime(),
      user: session.user
    });
  } catch (e) {
    return next(e);
  }
}
