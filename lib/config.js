/*
* Here we are defining environments
*
*/

//Container for environments
var environments = {}

//Staging env (default)
environments.stg = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'Staging',
    'hashingSecret': 'itIsASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'ACe14745af6fcc35afecaad57832e31cc0',
        'authToken': '56b3ded4edf7631f37e4c15f44d387ab',
        'messagingServiceSid': 'MG60c9ab78fff05acc77c8265d366234c9',
        'fromPhone': '+19842999911'
    }
};

//Production env
environments.prod = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'Production',
    'hashingSecret': 'itIsAlsoASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'ACe805bd0cf73b2fd8a6c3af47d04d03d5',
        'authToken': '56b3ded4edf7631f37e4c15f44d387ab',
        'messagingServiceSid': 'MG60c9ab78fff05acc77c8265d366234c9',
        'fromPhone': '+19842999911'
    }
};

//Determine which env was passed as CLI args
var currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV : '';

//Check if the current env is present in our environments,
//if not present default to staging 
var envToExport = typeof(environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.stg;

//Export only the env selected
module.exports = envToExport;