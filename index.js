const Twitter = require('twitter')

// Boots Twitter client that sends oauth requests.
const client = new Twitter({
  consumer_key: process.env.TWITTER_KEY,
  consumer_secret: process.env.TWITTER_SECRET,
  access_token_key: tokens.access_token_key,
  access_token_secret: tokens.access_token_secret
})

/**
 * Magic methods enum and their transformers.
 *
 * @var {any}
 */
const methods = {
  like: {
    endpoint: _ => `favorites/create`,
    params: id => ({ id })
  },
  retweet: {
    endpoint: id => `statuses/retweet/${id}`,
    params: _ => ({})
  },
  follow: {
    endpoint: _ => `friendships/create`,
    params: id => ({ id, follow: true })
  }
}

exports.handler = async (event, _, callback) => {
  const tokens = event.requestContext.authorizer

  return Promise.resolve(event.body)
    // Parse the event body with JSON information.
    .then(JSON.parse)
    .then(async ({ actions }) => {
      if (! actions || ! tokens) {
        throw ({ status: 422, error: 'MissingParameters' })
      }

      const jobs = await Promise.all(actions.map(({ method, id }) => {
        let url = methods[method].endpoint(id)
        let params = methods[method].params(id)

        // Sends a request to certain method and based on status
        // code from the response decides if the action has been successful.
        return sendRequest(client, url, params)
          .then(() => ({ [method]: true }))
          .catch(() => ({ [method]: false }))
      }))

      if (jobs.filter(Boolean).length === actions.length) {
        return ({ status: 200, body: '' })
      }

      return ({ status: 206, body: { result: jobs } })
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
 * @param {Twitter} client
 * @param {string} url
 * @param {any} params
 */
const sendRequest = (client, url, params) => {
  return new Promise((resolve, reject) => {
    client.post(url, params, error => console.log(url, params, error, error ? resolve() : reject()))
  })
}
