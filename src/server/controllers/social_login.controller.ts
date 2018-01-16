import * as string_helper from './../helpers/string'
import * as request from 'superagent'
import * as nodemailer from 'nodemailer'
import * as crypto from 'crypto'

import pendingUser from '../models/pending_user.model'
import realUser from '../models/user.model'
import emailToken from '../models/email_verif_token.model'
import phoneCode from '../models/phone_verif_code.model'

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
          found_user.social_email = user.email
          found_user.social_name = user.name
          await found_user.save()
          res.status(200).json({user: found_user, access_token})
        } else {
          user = await pendingUser.create({ social_name: user.name, social_id: user.id, social_verified: user.verified, social_email: user.email, social_type: provider })
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

    if(data.plan !== 'free') sum += 2 // this needs to be more detailed about the available plans - business, developer etc.
    sum += joined_github_months * 0.25
    if(data.two_factor_authentication) sum += 5
    sum += (data.public_repos + data.total_private_repos) * 0.05
    sum += data.followers * 0.02

  } else if(provider === 'facebook') {
    if(data.is_verified) { sum += 5 }
    if(data.verified) { sum += 5 }

  } else if(provider === 'linkedin') {
  } else { return false }
  
  return sum >= USER_THRESHOLD_VERIFIED
}


// EMAIL VERIFICATION
async function email_request(req, res, next) {
  try {
    let found_user:any = await pendingUser.findOne({ _id: req.body.user_id })
    if(!found_user) return res.status(500).send({message: 'User not found'})

    let duplicate_user:any = await pendingUser.findOne({ email: req.body.email })
    let email_in_use = false
    if(duplicate_user) email_in_use = duplicate_user.social_id !== found_user.social_id
    if(await realUser.findOne({ email: req.body.email }) || email_in_use || found_user.email_verified ) return res.status(500).send({ message: 'The email adress is already getting used' })
    
    let token:any = new emailToken({ user_id: found_user._id, token: crypto.randomBytes(16).toString('hex') })
    await token.save()

    found_user.email = req.body.email
    await found_user.save()

    let transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: process.env.GOOGLE_MAIL_ACCOUNT, pass: process.env.GOOGLE_MAIL_PASSWORD } })
    let mailOptions = { from: process.env.UTOPIAN_MAIL, to: req.body.email, subject: 'Utopian Email Confirmation', text: 'Hey there,\n\n' + `Please confirm your email for Utopian.io by clicking on this link: https://signup.utopian.io/email/confirm/${token.token}` + '.\n' }
    await transporter.sendMail(mailOptions)
    res.status(200).send('A verification email has been sent to ' + found_user.email + '.')
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: filter_error_message(error.message)})
  }
}

async function email_confirm(req, res, next) {
  try {
    let token:any = await emailToken.findOne({ token: req.body.token })
    if(!token) return res.status(400).send({ type: 'not-verified', message: 'We were unable to find a valid token. Your token may have expired.' })
  
    let found_user:any = await pendingUser.findOne({ _id: token.user_id })
    if(!found_user) return res.status(400).send({ message: 'We were unable to find a user for this token.' })
    if(found_user.email_verified) return res.status(400).send({ type: 'already-verified', message: 'This user has already been verified.' })

    found_user.email_verified = true
    await found_user.save()

    res.status(200).send({ message: "The email has been verified.", user: found_user})
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: filter_error_message(error.message)})
  }
}

// Phone Verification
async function phone_request(req, res, next) {
  try {
    let found_user:any = await pendingUser.findOne({ _id: req.body.user_id })
    if(!found_user) return res.status(500).send({message: 'User not found'})

    let phone_number = req.body.country_code + req.body.phone_number.replace(/\D/g,'')
    
    let duplicate_user:any = await pendingUser.findOne({ phone_number })
    let number_in_use = false
    if(duplicate_user) number_in_use = duplicate_user.social_id !== found_user.social_id
    if(await realUser.findOne({ phone_number }) || number_in_use || found_user.sms_verified ) return res.status(500).send({ message: 'The phone number is already getting used' })

    if(await phoneCode.findOne({ user_id: found_user._id })) return res.status(500).send({message: 'You have already a pending sms-confirmation!'})
    if(found_user.sms_verif_tries >= 3) res.status(500).send({message: 'Your requests for sms-verification went over the limit - please contact us on discord!'})

    let random_code = crypto.randomBytes(2).toString('hex')

    
    let response = await request.post('https://rest.nexmo.com/sms/json')
    .query({ to: phone_number, from: 'UTOPIAN.IO', text: `Your Code: ${random_code}` , api_key: process.env.NEXMO_API_KEY, api_secret: process.env.NEXMO_API_SECRET })
    console.log(response.body)
    if(response.body.status !== '0') {
      let phone_code:any = new phoneCode({ user_id: found_user._id, code: random_code, phone_number })
      await phone_code.save()
      console.log(phone_code.code)
      found_user.sms_verif_tries += 1
      await found_user.save()
      res.status(200).send('Code has been send via SMS')
    } else {
      res.status(500).json({ message: filter_error_message(response.body.status)})
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: filter_error_message(error.message)})
  }
}

async function phone_confirm(req, res, next) {
  try {
    let code:any = await phoneCode.findOne({ user_id: req.body.user_id,  code: req.body.code })
    if(!code) return res.status(400).send({ type: 'not-verified', message: 'Invalid SMS-Code' })
  
    let found_user:any = await pendingUser.findOne({ _id: code.user_id })
    if(!found_user) return res.status(400).send({ message: 'We were unable to find a user for this code.' })
    if(found_user.sms_verified) return res.status(400).send({ type: 'already-verified', message: 'This user has already been verified.' })

    found_user.sms_verified = true
    found_user.phone_number = code.phone_number
    await found_user.save()

    res.status(200).send({ message: "The sms has been verified.", user: found_user})
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: filter_error_message(error.message)})
  }
}

function filter_error_message(message) {
  if(message === 'No recipients defined') { message = 'You entered an invalid Email'}
  else if(message === '1') { message = 'Unknown Error while trying to send SMS' }
  else if(message === '2'  || message === '7'  || message === '8') { message = 'Temporary Error - please try again!' }
  else if(message === '3' || message === '4' ) { message = 'Invalid Number' }
  else if(message === '5') { message = 'Your number has been declined due to Spam-Rejection' }
  else if(message === '9') { message = 'Illegal Number' }
  else if(message === '15') { message = 'Please contact us on discord with the error code: NM' }
  else { message = 'We had an internal error. Please try again or contact us on discord!' }
  return message
}

export default { authenticate, email_confirm, email_request, phone_request, phone_confirm }