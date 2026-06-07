const { getLogicResponse } = require('./api/logic-engine');
const session = { history: [], state: null, data: {} };
getLogicResponse('test-user', 'log a fault', session).then(reply => {
    console.log('API Reply:', reply);
    if (reply.includes('FM Assist V3')) {
        console.log('SUCCESS: Logic engine returned valid response.');
    } else {
        console.log('FAILURE: Unexpected response.');
        process.exit(1);
    }
}).catch(err => {
    console.error('API Error:', err);
    process.exit(1);
});
