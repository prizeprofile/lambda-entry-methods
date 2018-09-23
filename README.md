# AWS Lambda: Entry Methods

Autoenters a Twitter competition.

## Enviroment variables

## Request

The event object has to be of following structure:

```
event.body = {
    ...
    "actions": [
        {
            "method": String,
            "id": Number
        },
        ...
    ],
    // Tokens are either passed in event body or in authorizer's context.
    "tokens": {
        "access_token": String,
        "access_token_secret": String
    }
}
```

## Responses

## Deployment
Deploy with `npm run deploy:{env}`.
