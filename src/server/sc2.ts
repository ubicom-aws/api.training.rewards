import * as request from 'superagent';
import * as user from './models/user.model';

export const BASE_URL = 'https://v2.steemconnect.com/api';
const SECRET = process.env.UTOPIAN_STEEMCONNECT_SECRET;

export interface AuthResponse {
  username: string;
  access_token: string;
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

  const req = request(opts.method, BASE_URL + endpoint);
  if (opts.data) req.send(opts.data);
  if (opts.user) req.set('Authorization', opts.user.sc2.token);

  const res = await req;
  if (res.status !== 200) {
    throw new Error('Invalid status getting code: '
                      + res.status + '\n' + res.body);
  }
  return res.body;
}

export async function getTokenFromCode(code: string): Promise<AuthResponse> {
  const auth = `/ouath2/token?code=${code}&client_secret=${SECRET}`;
  const data: AuthResponse = await send(auth);
  if (!(data.username && data.access_token && data.expires_in)) {
    throw new Error('Missing username, access_token, or expires_in');
  }
  return data;
}
