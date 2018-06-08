var m_users = require('../../models/backend/users_model.js');
var config = require('../../config/config.js');
var md5 = config.md5();
var fs = config.fs();
var path = config.path();
var formidable = config.formidable();
var app = config.app();
var body_parser = config.body_parser();
var get_base_url = config.get_base_url();
var get_admin_url = config.get_admin_url();

app.use(body_parser.json()); // support json encoded bodies
app.use(body_parser.urlencoded({ extended: true })); // support encoded bodies

// config mail
var nodemailer = require('nodemailer');
var mail_auth = nodemailer.createTransport({ service: 'gmail', auth: { user: 'authentication.smtp.mail@gmail.com', pass: 'u+J%E^9!hx?p' } });
// end config mail
function valid_username(username) {
    var re = /^[a-zA-Z0-9]+$/;
    return re.test(username);
}
function valid_email(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
function valid_password(password) {
    var re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
    return re.test(password);
}

var users_controller = {
    signin: (req, res, next) => {
        if (req.method == 'POST') {
            var username = req.body.username ? req.body.username : null;
            var password = req.body.password ? req.body.password : null;
            if ((username != null && password != null)) {
                m_users.findOne({
                    $or: [{ username: username }, { email: username }], password: md5(password)
                }).exec((err, result) => {
                    if (result) {
                        req.session.me = result;
                        res.redirect(get_admin_url + '/dashboard');
                    } else {
                        res.render('backend/users/signin.ejs', {
                            incorrect: true
                        });
                    }
                });
            } else { // if nó phá bậy bạ
                res.redirect('/signin');
            }
        } else if (req.method == 'GET') { // if GET
            if (req.session.me) {
                res.redirect(get_admin_url + '/dashboard');
            } else {
                res.render('backend/users/signin.ejs');
            }
        }
    },
    signup: (req, res) => {
        io.on('connection', (socket) => { // check exist with socket.io
            socket.on('guest_username', (username) => {
                m_users.findOne({ username: username }).exec((err, result) => {
                    if (result) { socket.emit('ser_exist_username'); }
                })
            });
            socket.on('guest_email', (email) => {
                m_users.findOne({ email: email }).exec((err, result) => {
                    if (result) { socket.emit('ser_exist_email'); }
                })
            });
            socket.setMaxListeners(0);
        });
        if (req.method == 'POST') {
            var username = req.body.username ? req.body.username : null;
            var email = req.body.email ? req.body.email : null;
            var password = req.body.password ? req.body.password : null;
            if ((username != null && email != null && password != null) && (valid_username(username) && valid_email(email) && valid_password(password))) {
                var arr_data = new Object();
                arr_data.username = username;
                arr_data.email = email;
                arr_data.display_name = username;
                arr_data.password = md5(password);
                arr_data.thumbnail = null;
                arr_data.key = md5(Math.random().toString());
                arr_data.verify = '0';
                arr_data.role = '0';
                arr_data.created_at = new Date();
                m_users.create(arr_data, (err, result) => {
                    if (result) {
                        req.session.me = result;
                        res.redirect(get_admin_url + '/dashboard');
                        // verify email
                        var url_verify = get_base_url + '/verify/' + result.username + '/' + result.key;
                        var mail_options = {
                            from: 'it.hoangsi@gmail.com', to: email, subject: '[' + config.blog_name() + '] Please verify your email address.',
                            html: `
                                Help us secure your account by verifying your email address (` + result.email + `). This lets you access all of our features.<br><br>
                                <a href="` + url_verify + `">` + url_verify + `</a><br><br>
                                You’re receiving this email because you recently created a new `+ config.blog_name() + ` account or added a new email address. If this wasn’t you, please ignore this email.`
                        };
                        mail_auth.sendMail(mail_options, (err, sent) => {
                            if (!err) {
                                console.log('Sent verify!');
                            }
                        });
                        // end verify email
                    }
                });
            } else { // if nó phá bậy bạ
                res.redirect(get_base_url + '/signup');
            }
        } else if (req.method == 'GET') {// if GET
            if (req.session.me) {
                res.redirect(get_admin_url + '/dashboard');
            } else {
                res.render('backend/users/signup.ejs');
            }
        }
    },
    verify: (req, res) => {
        var username = req.params.username ? req.params.username : null;
        var key = req.params.key ? req.params.key : null;
        if (username != null && key != null) {
            m_users.findOneAndUpdate({ username: username, key: key }, { $set: { verify: 1 } }, { new: true }, (err, result) => {
                if (result) {
                    if (req.session.me) {
                        res.redirect(get_admin_url + '/users/profile');
                    } else {
                        res.render('backend/users/verify.ejs', {
                            verified: true,
                            username: result.username ? result.username : null,
                            email: result.email ? result.email : null,
                        });
                    }
                } else { // nếu url sai
                    res.redirect(get_base_url + '/signin');
                }
            })
        }
    },
    signout: (req, res) => {
        req.session = null;
        res.redirect(get_base_url + '/signin/')
    },
    password_reset: (req, res) => {
        if (req.method == 'POST') {
            var email = req.body.email ? req.body.email : null;
            if (email != null && valid_email(email)) {
                m_users.findOne({ email: email }).exec(function (err, result) {
                    if (!result) {
                        res.render('backend/users/password_reset.ejs', {
                            not_match_email: true
                        });
                    } else {
                        if (result.verify == '0') { // kiểm tra xem email đã được xác minh hay chưa
                            res.render('backend/users/password_reset.ejs', {
                                unverify: true
                            });
                        } else {
                            m_users.findOneAndUpdate({ email: email }, { $set: { key: md5(Math.random().toString()) } }, { new: true }, (err, result) => {
                                var url_password_reset = get_base_url + '/password_reset?key=' + result.key;
                                var mail_options = {
                                    from: 'it.hoangsi@gmail.com', to: email, subject: '[' + config.blog_name() + '] Please reset your password',
                                    html: `We heard that you lost your password. Sorry about that! <br> But don’t worry! You can use the following link to reset your password:<br><br>
                                <a href="` + url_password_reset + `">` + url_password_reset + `</a><br><br>Thanks!`
                                };
                                mail_auth.sendMail(mail_options, function (err, sent) {
                                    if (!err) {
                                        res.render('backend/users/password_reset.ejs', {
                                            sent_email: true
                                        });
                                    }
                                });
                            });
                        }
                    }
                });
            } else { // if nó phá bậy bạ
                res.redirect(get_admin_url + '/password_reset');
            }
        } else if (req.method == 'GET') { // if GET
            var key = req.query.key ? req.query.key : null;
            if (typeof key !== 'undefined' && key) {
                m_users.findOne({ key: key }).exec(function (err, result) { // nếu key đúng mới hiện form đổi mật khẩu
                    if (result) {
                        res.render('backend/users/change_password_reset.ejs', {
                            key: key ? key : null
                        });
                    } else { // key ko hợp lệ
                        res.render('backend/users/password_reset.ejs', {
                            not_match_key: true
                        });
                    }
                });
            } else { // if ko có key thì trả ra giao diện
                res.render('backend/users/password_reset.ejs');
            }
        } else if (req.method == 'PUT') { // if PUT
            var key = req.query.key ? req.query.key : null;
            var password = req.body.password ? req.body.password : null;
            if (password != null && valid_password(password)) {
                m_users.findOneAndUpdate({ key: key }, { $set: { password: md5(password) } }, { new: true }, (err, result) => {
                    if (result) {
                        // sau khi đổi thành công thì đổi key để khỏi truy cập vào link cũ
                        m_users.findOneAndUpdate({ key: key }, { $set: { key: md5(Math.random().toString()) } }, { new: true }, (err, result) => {
                            if (result) { res.redirect(get_base_url + '/signin') }
                        });
                    } else { // đây là trường hợp đúng key, vào trang đổi pass, nhưng nó kiểm tra phần từ và đổi key
                        res.redirect(get_base_url + '/password_reset');
                        console.log('Key đã bị sửa, không khớp');
                    }
                });
            } else { // đây là trường hợp nó phá
                res.redirect(get_base_url + '/password_reset');
            }
        }
    },




    // CURD

    users: (req, res, next) => { // list all & search
        var key_search = req.query.search ? req.query.search : null;
        var per_page = 5;
        var page = req.params.page || 1;
        var page_slug = 'users'; // khai báo slug để sử dụng lại pagination nhiều lần

        if (!key_search) {
            var page_title = 'All users';
            m_users.find({})
                .skip((per_page * page) - per_page)
                .limit(per_page)
                .exec(function (err, result) {
                    m_users.count().exec(function (err, count) {
                        return res.render('backend/users/users', {
                            data_users: JSON.stringify(result) ? JSON.stringify(result) : null,
                            current: page,
                            pages: Math.ceil(count / per_page),
                            page_slug: page_slug ? page_slug : null,
                            paginate: count > per_page ? true : false,
                            page_title: page_title
                        });
                    });
                });
        } else { // if search
            var page_title = 'Search result';
            m_users.find({
                $or: [
                    { 'username': new RegExp('^' + key_search + '$', "i") },
                    { 'email': new RegExp('^' + key_search + '$', "i") },
                    { 'display_name': new RegExp('^' + key_search + '$', "i") }
                ]
            })
                .skip((per_page * page) - per_page)
                .limit(per_page)
                .exec(function (err, result) {
                    m_users.find({
                        $or: [
                            { 'username': new RegExp('^' + key_search + '$', "i") },
                            { 'email': new RegExp('^' + key_search + '$', "i") },
                            { 'display_name': new RegExp('^' + key_search + '$', "i") }
                        ]
                    }).count().exec(function (err, count) {
                        return res.render('backend/users/users', {
                            data_users: JSON.stringify(result) ? JSON.stringify(result) : null,
                            current: page,
                            pages: Math.ceil(count / per_page),
                            page_slug: page_slug ? page_slug : null,
                            key_search: key_search ? key_search : null,
                            count_result: count ? count : null,
                            paginate: count > per_page ? true : false,
                            page_title: page_title
                        });
                    });
                });
        }
    },
    create: (req, res, next) => {
        io.on('connection', (socket) => { // check exist with socket.io
            socket.on('guest_username', (username) => {
                m_users.findOne({ username: username }).exec((err, result) => {
                    if (result) { socket.emit('ser_exist_username'); }
                })
            });
            socket.on('guest_email', (email) => {
                m_users.findOne({ email: email }).exec((err, result) => {
                    if (result) { socket.emit('ser_exist_email'); }
                })
            });
            socket.setMaxListeners(0);
        });

        if (req.method == 'GET') {
            var page_slug = 'create_user';
            var page_title = 'Add new user';
            res.render('backend/users/create', {
                page_slug: page_slug,
                page_title: page_title
            });
        } else if (req.method == 'POST') {
            var form = new formidable.IncomingForm(); form.maxFileSize = 200 * 1024 * 1024;
            form.parse(req, (err, fields, files) => {
                username = fields.username ? fields.username : null;
                email = fields.email ? fields.email : null;
                password = fields.password ? fields.password : null;
                if ((username != null && email != null && password != null) && (valid_username(username) && valid_email(email) && valid_password(password))) {
                    var arr_data = new Object();
                    arr_data.username = username;
                    arr_data.email = email;
                    arr_data.display_name = fields.display_name ? fields.display_name : null;
                    arr_data.password = md5(password);
                    if (files.thumbnail) {
                        var name_file = md5(Math.random().toString());
                        var oldpath = files.thumbnail.path;
                        var type_file = (files.thumbnail.name.split('.'))[1];
                        var newpath = path.resolve('assets/backend/uploads/' + name_file + '.' + type_file);
                        fs.rename(oldpath, newpath, (err) => { });
                        arr_data.thumbnail = name_file + '.' + type_file;
                    }
                    arr_data.key = md5(Math.random().toString());
                    arr_data.verify = '0';
                    arr_data.role = fields.role ? fields.role : '0';
                    arr_data.created_at = new Date();
                    m_users.create(arr_data, (err, result) => {
                        if (result) {
                            res.redirect(get_admin_url + '/users/edit/' + result._id)
                            // verify email
                            var url_verify = get_base_url + '/verify/' + result.username + '/' + result.key;
                            var mail_options = {
                                from: 'it.hoangsi@gmail.com', to: email, subject: '[' + config.blog_name() + '] Please verify your email address.',
                                html: `
                                    Help us secure your account by verifying your email address (` + result.email + `). This lets you access all of our features.<br><br>
                                    <a href="` + url_verify + `">` + url_verify + `</a><br><br>
                                    You’re receiving this email because you recently created a new `+ config.blog_name() + ` account or added a new email address. If this wasn’t you, please ignore this email.`
                            };
                            mail_auth.sendMail(mail_options, (err, sent) => {
                                if (!err) { console.log('Sent verify!'); }
                            });
                            // end verify email
                        }
                    });
                }
            });
        }
    },

    update: (req, res) => {
        io.on('connection', (socket) => { // check exist with socket.io
            socket.on('guest_username', (username) => {
                m_users.findOne({ username: username }).exec((err, result) => {
                    if (result) { socket.emit('ser_exist_username'); }
                })
            });
            socket.on('guest_email', (email) => {
                m_users.findOne({ email: email }).exec((err, result) => {
                    if (result) { socket.emit('ser_exist_email'); }
                })
            });
            socket.setMaxListeners(0);
        });
        if (req.method == 'GET') {
            var page_slug = 'edit_user';
            var page_title = 'Edit user';
            var id = req.params.id;
            m_users.findOne({ _id: id }, (err, result) => {
                return res.render('backend/users/edit', {
                    data_user: JSON.stringify(result) ? JSON.stringify(result) : null,
                    page_slug: page_slug,
                    page_title: page_title
                });
            });
        } else if (req.method == 'PUT') {
            var form = new formidable.IncomingForm(); form.maxFileSize = 200 * 1024 * 1024;
            form.parse(req, (err, fields, files) => {
                var id = fields.id;
                if (id) {
                    email = fields.email && valid_email(fields.email) ? fields.email : null;
                    password = fields.password && valid_password(fields.password) ? md5(fields.password) : null;
                    var arr_data = new Object();
                    arr_data.email = email;
                    arr_data.display_name = fields.display_name ? fields.display_name : null;
                    arr_data.password = password;
                    if (files.thumbnail.name) {
                        var name_file = md5(Math.random().toString());
                        var oldpath = files.thumbnail.path;
                        var type_file = (files.thumbnail.name.split('.'))[1];
                        var newpath = path.resolve('assets/backend/uploads/' + name_file + '.' + type_file);
                        fs.rename(oldpath, newpath, (err) => { });
                        arr_data.thumbnail = name_file + '.' + type_file;
                    }

                    arr_data.role = fields.role ? fields.role : null;
                    arr_data.updated_at = new Date();
                    m_users.findOneAndUpdate({ _id: id }, { $set: arr_data }, { new: true }, (err, result) => {
                        if (result) {
                            res.redirect(get_admin_url + '/users/edit/' + result._id)
                        }
                    });
                }
            });
        }
    },
    delete: (req, res) => {
        var page_slug = 'delete';
        var page_title = 'Delete user';
        var id = req.body.id;
        m_users.deleteOne({ _id: id }, (err, result) => {
            res.redirect(get_admin_url + '/users')
        });
    }
    // End CURD

}
module.exports = users_controller;