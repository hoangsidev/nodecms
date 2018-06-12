var m_users = require('../../models/users_model.js');
var backend_controller = {
    dashboard: (req, res, next) => {
        res.render('backend/dashboard', {
            site_info: {
                page_title: 'Dashboard',
                page_slug: 'dashboard',
                me: req.session.me ? req.session.me : null
            }
        });
    }
}
module.exports = backend_controller;