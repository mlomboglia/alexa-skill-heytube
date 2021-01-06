var axios = require('axios');

const instance = axios.create({
    baseURL: 'https://www.googleapis.com/',
    params: {
        key: process.env.YOUTUBE_API_KEY
    }
});

module.exports = instance;

