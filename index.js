const OAuth = require('oauth').OAuth

/**
 * Magic methods enum and their transformers.
 *
 * @var {any}
 */
const methods = {
  like: {
    endpoint: _ => `https://api.twitter.com/1.1/favorites/create.json`,
    params: id => ({ id })
  },
  retweet: {
    endpoint: id => `https://api.twitter.com/1.1/statuses/retweet/${id}.json`,
    params: _ => null
  },
  follow: {
    endpoint: _ => `https://api.twitter.com/1.1/friendships/create.json`,
    params: id => ({ id, follow: true })
  }
}

exports.handler = (event, _, callback) => {
  const tokens = event.requestContext.authorizer

  const client = new OAuth(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    process.env.TWITTER_KEY,
    process.env.TWITTER_SECRET,
    '1.0',
    process.env.CALLBACK_URI,
    'HMAC-SHA1'
  )

  return Promise.resolve(event.body)
    // Parse the event body with JSON information.
    .then(JSON.parse)
    .then(({ actions }) => {

      if (! actions || ! tokens) {
        throw ({ status: 422, error: 'MissingParameters' })
      }

      return Promise.all(actions.map(({ method, id }) => {
        let url = methods[method].endpoint(id)
        let params = methods[method].params(id)

        // Sends a request to certain method and based on status
        // code from the response decides if the action has been successful.
        return sendRequest(client, tokens, url, params)
          .then(() => ({ method, success: true }))
          .catch(() => ({ method, success: false }))
      }))
        .then((jobs) => {
          if (jobs.filter(job => job.success).length === actions.length) {
            return ({ status: 200, body: '' })
          }

          return ({ status: 206, body: { result: jobs } })
        })
    })
    .then(({ status, body }) => callback(null, {
      statusCode: status,
      headers: {
        'Access-Control-Allow-Origin' : '*'
      },
      body: JSON.stringify(body)
    }))
    .catch(({ status, error }) => callback(null, {
      statusCode: status,
      headers: {
        'Access-Control-Allow-Origin' : '*'
      },
      body: JSON.stringify({ status, error })
    }))
}

/**
 * @param {OAuth} client
 * @param {any} tokens
 * @param {string} url
 * @param {any} params
 */
const sendRequest = (client, { access_token, access_token_secret }, url, params) => {
  return new Promise((resolve, reject) => {
    client.post(
      url,
      access_token,
      access_token_secret,
      params,
      null,
      error => error ? reject() : resolve())
  })
}
