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
};

//Production env
environments.prod = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'Production',
    'hashingSecret': 'itIsAlsoASecret',
    'maxChecks': 5,
};

//Determine which env was passed as CLI args
var currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV : '';

//Check if the current env is present in our environments,
//if not present default to staging 
var envToExport = typeof(environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.stg;

//Export only the env selected
module.exports = envToExport;