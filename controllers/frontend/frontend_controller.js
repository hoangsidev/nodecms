var m_articles = require('../../models/backend/articles_model.js');

var home_controller = {
    index: (req, res) => {
        res.render('frontend/index');
    }
}
module.exports = home_controller;