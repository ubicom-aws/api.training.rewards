import * as string_helper from './../helpers/string'
import * as request from 'superagent';
import pendingUser from '../models/pending_user.model'

const USER_API_GITHUB = 'https://api.github.com/user'
const EMAIL_API_GITHUB = 'https://api.github.com/user/emails'
const USER_API_FACEBOOK = 'https://graph.facebook.com/me?fields=id,name,email,is_verified,verified'
const USER_API_LINKEDIN = 'https://api.linkedin.com/v2/me'

const USER_THRESHOLD_VERIFIED = 5

const request_github_token = (body) => {
  return request.post('https://github.com/login/oauth/access_token')
    .set('Content-Type', 'application/json')
    .send({
    client_id: process.env.UTOPIAN_SOCIAL_GITHUB_CLIENT_ID, // CHANGE THIS
    client_secret: process.env.UTOPIAN_SOCIAL_GITHUB_SECRET, // CHANGE THIS
    code: body.code, redirect_uri: body.redirectUri, state: body.state,
    scope: ['read:user','user:email','public_repo','read:org'], grant_type: 'authorization_code'
  })
}

const request_facebook_token = (body) => {
  return request
  .post('https://graph.facebook.com/oauth/access_token')
  .set('Content-Type', 'application/json')
  .send({
    client_id: process.env.UTOPIAN_SOCIAL_FACEBOOK_CLIENT_ID,
    client_secret: process.env.UTOPIAN_SOCIAL_FACEBOOK_SECRET,
    code: body.code, redirect_uri: body.redirectUri
  })
}

const request_linkedin_token = (body) => {
  return request
  .post('https://www.linkedin.com/oauth/v2/accessToken')
  .set('Content-Type', 'application/x-www-form-urlencoded')
  .send({
    client_id: process.env.UTOPIAN_SOCIAL_LINKEDIN_CLIENT_ID,
    client_secret: process.env.UTOPIAN_SOCIAL_LINKEDIN_SECRET,
    code: body.code, redirect_uri: body.redirectUri, grant_type: 'authorization_code'
  })
}

async function authenticate(req, res, next) {
  try {
    let { code, state } = req.body
    let { provider } = req.params
    let request_token = (body:any) => {}
    let request_api_user = ''
    if(provider === 'github') { request_token = request_github_token; request_api_user = USER_API_GITHUB }
    else if(provider === 'facebook') { request_token = request_facebook_token; request_api_user = USER_API_FACEBOOK }
    else if(provider === 'linkedin') { request_token = request_linkedin_token; request_api_user = USER_API_LINKEDIN }
    //if (code && state && (code !== "-") && (state !== "-")) {
    if(code && (code !== "-") && request_api_user) {
      let tokenRes:any = await request_token(req.body)
      let access_token = tokenRes.body.access_token
      if(access_token) {
      // LinkedIn = 'oauth2_access_token':
      request.get(request_api_user).query({access_token}).end(async (err, result) => {
        let data = provider === 'github' ? result.body : JSON.parse(result.text)
        let user:any = { id: data.id, email: data.email }
        user.name = provider === 'github' ? data.login : data.name
        user.verified = is_user_verified(provider, data)
        if(provider === 'github' && !user.email) {
            let resp_email = await request.get(EMAIL_API_GITHUB).query({access_token})
            user.email = await get_primary_email(resp_email.body)
        }
        let found_user = await pendingUser.get(user.id)
        if(found_user) {
          if(found_user.has_created_account) { return res.status(500) }
          found_user.social_verified = user.verified
          found_user.email = user.email
          found_user.social_name = user.name
          await found_user.save()
          res.status(200).json({user: found_user, access_token})
        } else {
          user = await pendingUser.create({ social_name: user.name, social_id: user.id, social_verified: user.verified, email: user.email, social_type: provider })
          res.status(200).json({user, access_token})
        }
      })
    } else { res.status(500) }
  } else { res.status(500) }
  } catch (e) { next(e) }
}

// In Months
function joined_since(date) { return Math.round((Date.now() - new Date(date).getTime()) / ( 1000 * 60 * 60 * 24 * 4 * 12 )) }

async function get_primary_email(emails) {
  let found_primary = null
  for (let i = 0; i < emails.length; i++) {
    if(emails[i].primary && emails[i].verified) {	found_primary = emails[i].email; break }
  }
  return found_primary
}

function is_user_verified(provider, data) {
  let sum = 0
  if(provider === 'github') {
    let joined_github_months = joined_since(data.created_at)

    if(data.plan !== 'free') { sum += 2 } // this needs to be more detailed about the available plans - business, developer etc.
    sum += joined_github_months * 0.25
    if(data.two_factor_authentication) { sum += 5 }
    sum += (data.public_repos + data.total_private_repos) * 0.05
    sum += data.followers * 0.02

  } else if(provider === 'facebook') {
    if(data.is_verified) { sum += 5 }
    if(data.verified) { sum += 5 }

  } else if(provider === 'linkedin') {
  } else { return false }
  
  return sum >= USER_THRESHOLD_VERIFIED
}

export default { authenticate }