import * as request from 'superagent';
import * as user from './models/user.model';
import config from '../config/config';

const BASE_URL = `${config.steemconnectHost}/api`;
const SECRET = process.env.UTOPIAN_STEEMCONNECT_SECRET;

export interface AuthResponse {
  username: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface SendOpts {
  method?: string;
  user?: any;
  data?: any;
}

export async function send(endpoint: string, opts?: SendOpts) {
  if (!opts) opts = {};
  if (!opts.method) opts.method = 'POST';
  if (opts.user && !opts.user.sc2) throw new Error('User has no token');

  const req = request(opts.method, BASE_URL + endpoint);
  if (opts.data) req.send(opts.data);
  if (opts.user) req.set('Authorization', opts.user.sc2.token);

  const res = await req;
  if (res.status !== 200) {
    throw new Error('Invalid status from API: '
                      + res.status + '\n' + res.body);
  }
  return res.body;
}

export async function getToken(code: string,
                                refresh = false): Promise<AuthResponse> {
  let field;
  if (refresh) {
    field = `refresh_token=${code}`;
  } else {
    field = `code=${code}`;
  }

  const scopes = [
    'vote',
    'comment',
    'comment_delete',
    'comment_options',
    'custom_json',
    'claim_reward_balance',
    'offline'
  ].join(',');
  const scope = `scope=${encodeURIComponent(scopes)}`;

  const auth = `/oauth2/token?${field}&client_secret=${SECRET}&${scope}`;
  const data: AuthResponse = await send(auth);
  if (!(data.username
          && data.access_token
          && data.refresh_token
          && data.expires_in)) {
    throw new Error('Missing required fields for authorization');
  }
  return data;
}
