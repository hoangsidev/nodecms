var m_users = require('../../models/backend/users_model.js');
var backend_controller = {
    dashboard: (req, res) => {
        var page_slug = 'dashboard';
        var page_title = 'Dashboard';
        // console.log(req.session.me);
        res.render('backend/dashboard', {
            page_slug: page_slug,
            page_title: page_title
        });
    }
}
module.exports = backend_controller;