var configs = require('../../config/configs.js'),
    m_users = require('../../models/users_model.js'),
    md5 = configs.md5(),
    fs = configs.fs(),
    path = configs.path(),
    formidable = configs.formidable(),
    app = configs.app(),
    body_parser = configs.body_parser(),
    get_site_url = configs.get_site_url(),
    get_admin_url = configs.get_admin_url(),
    get_site_name = configs.get_site_name(),
    nodemailer = configs.nodemailer(),
    mail_auth = nodemailer.createTransport({ service: 'gmail', auth: { user: 'authentication.smtp.mail@gmail.com', pass: 'u+J%E^9!hx?p' } });

app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));


function valid_username(username) {
    if (username) {
        var re = /^[a-zA-Z0-9]+$/;
        return re.test(username);
    }
}
function valid_email(email) {
    if (email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }
}
function valid_password(password) {
    if (password) {
        var re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
        return re.test(password);
    }
}

function check_exist_user() { // check exist username & email with socket.io
    io.on('connection', (socket) => {
        socket.on('guest_username', (username) => {
            var username = (username && username != null && username != '' && typeof username !== 'undefined' && valid_username(username)) ? username : undefined;
            if (username) {
                m_users.findOne({ username: username }).exec((err, result) => {
                    if (result) { socket.emit('ser_exist_username'); }
                })
            }
        });
        socket.on('guest_email', (email) => {
            var email = (email && email != null && email != '' && typeof email !== 'undefined' && valid_email(email)) ? email : undefined;
            if (email) {
                m_users.findOne({ email: email }).exec((err, result) => {
                    if (result) { socket.emit('ser_exist_email'); }
                })
            }
        });
        socket.setMaxListeners(0);
    });
}

var users_controller = {
    signin: (req, res, next) => { // done
        if (req.method == 'GET') {
            if (req.session.me) {
                res.redirect(get_admin_url + '/dashboard');
            } else {
                res.render('backend/users/signin.ejs', {
                    site_info: {
                        page_title: 'Sign in',
                        page_slug: 'signin'
                    }
                });
            }
        } else if (req.method == 'POST') {
            var username = (req.body.username && req.body.username != null && req.body.username != '' && typeof req.body.username !== 'undefined') ? req.body.username : undefined,
                password = (req.body.password && req.body.password != null && req.body.password != '' && typeof req.body.password !== 'undefined') ? req.body.password : undefined;
            if (username && password) {
                m_users.findOne({
                    $or: [{ username: username }, { email: username }], password: md5(password)
                }).exec((err, result) => {
                    if (result) {
                        req.session.me = result;
                        res.redirect(get_admin_url + '/dashboard');
                    } else {
                        res.render('backend/users/signin.ejs', {
                            site_info: {
                                page_title: 'Sign in',
                                page_slug: 'signin'
                            },
                            incorrect: true
                        });
                    }
                });
            } else { // if nó phá bậy bạ
                res.redirect('/signin');
            }
        }
    },
    signup: (req, res, next) => { // done
        check_exist_user();
        if (req.method == 'GET') {// if GET
            if (req.session.me) {
                res.redirect(get_admin_url + '/dashboard');
            } else {
                res.render('backend/users/signup.ejs', {
                    site_info: {
                        page_title: 'Sign up',
                        page_slug: 'signup'
                    }
                });
            }
        } else if (req.method == 'POST') {
            var username = (req.body.username && req.body.username != null && req.body.username != '' && typeof req.body.username !== 'undefined' && valid_username(req.body.username)) ? req.body.username : undefined,
                email = (req.body.email && req.body.email != null && req.body.email != '' && typeof req.body.email !== 'undefined' && valid_email(req.body.email)) ? req.body.email : undefined,
                password = (req.body.password && req.body.password != null && req.body.password != '' && typeof req.body.password !== 'undefined' && valid_password(req.body.password)) ? req.body.password : undefined;
            if (username && email && password) {
                var arr_data = new Object();
                arr_data.username = username;
                arr_data.email = email;
                arr_data.display_name = display_name;
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
                        var url_verify = get_site_url + '/verify/' + result.username + '/' + result.key,
                            mail_options = {
                                from: 'it.hoangsi@gmail.com', to: email, subject: '[' + get_site_name + '] Please verify your email address.',
                                html: `
                                Help us secure your account by verifying your email address (` + result.email + `). This lets you access all of our features.<br><br>
                                <a href="` + url_verify + `">` + url_verify + `</a><br><br>
                                You’re receiving this email because you recently created a new `+ get_site_name + ` account or added a new email address. If this wasn’t you, please ignore this email.`
                            };
                        mail_auth.sendMail(mail_options, (err, sent) => {
                            if (!err) { console.log('Sent verify!'); }
                        });
                        // end verify email
                    }
                });
            } else { // if nó phá bậy bạ
                res.redirect(get_site_url + '/signup');
            }
        }
    },
    verify: (req, res, next) => { // done
        var username = (req.params.username && req.params.username != null && req.params.username != '' && typeof req.params.username !== 'undefined' && valid_username(req.params.username)) ? req.params.username : undefined,
            key = (req.params.key && req.params.key != null && req.params.key != '' && typeof req.params.key !== 'undefined') ? req.params.key : undefined;
        if (username && key) {
            m_users.findOneAndUpdate({ username: username, key: key }, { $set: { verify: 1 } }, { new: true }, (err, result) => {
                if (result) {
                    if (req.session.me) {
                        res.redirect(get_admin_url + '/users/profile');
                    } else {
                        res.render('backend/users/verify.ejs', {
                            verified: true,
                            username: result.username ? result.username : null,
                            email: result.email ? result.email : null,
                            site_info: {
                                page_title: 'Verify Email',
                                page_slug: 'verify'
                            }
                        });
                    }
                } else { // nếu url sai
                    res.redirect(get_site_url + '/signin');
                }
            })
        }
    },
    signout: (req, res, next) => { // done
        req.session = null;
        if (req.session == null) {
            res.redirect(get_site_url + '/signin');
        }
    },
    password_reset: (req, res, next) => { // done
        if (req.method == 'GET') { // if GET
            var key = (req.query.key && req.query.key != null && req.query.key != '' && typeof req.query.key !== 'undefined') ? req.query.key : undefined;
            if (key) {
                m_users.findOne({ key: key }).exec((err, result) => { // nếu key đúng mới hiện form đổi mật khẩu
                    if (result) {
                        res.render('backend/users/change_password_reset.ejs', {
                            key: key ? key : null,
                            site_info: {
                                page_title: 'Password Reset',
                                page_slug: 'password_reset'
                            }
                        });
                    } else { // key ko hợp lệ
                        res.render('backend/users/password_reset.ejs', {
                            not_match_key: true,
                            site_info: {
                                page_title: 'Password Reset',
                                page_slug: 'password_reset'
                            }
                        });
                    }
                });
            } else { // if ko có key thì trả ra giao diện
                res.render('backend/users/password_reset.ejs', {
                    site_info: {
                        page_title: 'Password Reset',
                        page_slug: 'password_reset'
                    }
                });
            }
        } else if (req.method == 'POST') {
            var email = (req.body.email && req.body.email != null && req.body.email != '' && typeof req.body.email !== 'undefined' && valid_email(req.body.email)) ? req.body.email : undefined;
            if (email) {
                m_users.findOne({ email: email }).exec((err, result) => {
                    if (!result) { // email not exist
                        res.render('backend/users/password_reset.ejs', {
                            not_match_email: true, 
                            site_info: {
                                page_title: 'Password Reset',
                                page_slug: 'password_reset'
                            }
                        });
                    } else {
                        if (result.verify == '0') { // if email not verified, can not reset pass
                            res.render('backend/users/password_reset.ejs', {
                                unverify: true,
                                site_info: {
                                    page_title: 'Password Reset',
                                    page_slug: 'password_reset'
                                }
                            });
                        } else { // if exist email, set a key, then send a email to user
                            m_users.findOneAndUpdate({ email: email }, { $set: { key: md5(Math.random().toString()) } }, { new: true }, (err, result) => {
                                var url_password_reset = get_site_url + '/password_reset?key=' + result.key,
                                    mail_options = {
                                        from: 'it.hoangsi@gmail.com', to: email, subject: '[' + get_site_name + '] Please reset your password',
                                        html: `We heard that you lost your password. Sorry about that! <br> But don’t worry! You can use the following link to reset your password:<br><br>
                                <a href="` + url_password_reset + `">` + url_password_reset + `</a><br><br>Thanks!`
                                    };
                                mail_auth.sendMail(mail_options, (err, sent) => {
                                    if (!err) {
                                        res.render('backend/users/password_reset.ejs', {
                                            sent_email: true,
                                            site_info: {
                                                page_title: 'Password Reset',
                                                page_slug: 'password_reset'
                                            }
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
        } else if (req.method == 'PUT') { // if PUT
            var password = (req.body.password && req.body.password != null && req.body.password != '' && typeof req.body.password !== 'undefined' && valid_password(req.body.password)) ? req.body.password : undefined,
                key = (req.query.key && req.query.key != null && req.query.key != '' && typeof req.query.key !== 'undefined') ? req.query.key : undefined;
            if (password && key) {
                m_users.findOneAndUpdate({ key: key }, { $set: { password: md5(password) } }, { new: true }, (err, result) => {
                    if (result) { // after change password, change key to access denied to old links
                        m_users.findOneAndUpdate({ key: key }, { $set: { key: md5(Math.random().toString()) } }, { new: true }, (err, result) => {
                            if (result) { res.redirect(get_site_url + '/signin') }
                        });
                    } else { // đây là trường hợp đúng key, vào trang đổi pass, nhưng nó kiểm tra phần từ và đổi key
                        res.redirect(get_site_url + '/password_reset');
                        console.log('Key đã bị sửa, không khớp');
                    }
                });
            } else { // đây là trường hợp nó phá
                res.redirect(get_site_url + '/password_reset');
            }
        }
    },

    // CURD
    users: (req, res, next) => { // done
        var key_search = (req.query.search && req.query.search != null && req.query.search != '' && typeof req.query.search !== 'undefined') ? req.query.search : undefined,
            per_page = 20,
            page = (req.params.page && req.params.page != null && req.params.page != '' && typeof req.params.page !== 'undefined') ? req.params.page : 1;
        if (!key_search) {  // list all
            m_users.find({}).skip((per_page * page) - per_page).limit(per_page).exec((err, result) => {
                m_users.count().exec(function (err, count) {
                    return res.render('backend/users/users', {
                        data_users: JSON.stringify(result) ? JSON.stringify(result) : null,
                        current: page,
                        pages: Math.ceil(count / per_page),
                        paginate: (count > per_page) ? true : false,
                        site_info: {
                            page_title: 'All users',
                            page_slug: 'users',
                            me: req.session.me ? req.session.me : null
                        }
                    });
                });
            });
        } else { // if search     
            var regex = [
                { 'username': new RegExp(key_search + '$', "i") },
                { 'email': new RegExp(key_search + '$', "i") },
                { 'display_name': new RegExp(key_search + '$', "i") }
            ];
            m_users.find({ $or: regex }).skip((per_page * page) - per_page).limit(per_page).exec((err, result) => {
                m_users.find({ $or: regex }).count().exec((err, count) => {
                    return res.render('backend/users/users', {
                        data_users: JSON.stringify(result) ? JSON.stringify(result) : null,
                        current: page,
                        pages: Math.ceil(count / per_page),
                        key_search: key_search ? key_search : null,
                        count_result: count ? count : null,
                        paginate: count > per_page ? true : false,
                        site_info: {
                            page_title: 'Search result',
                            page_slug: 'search',
                            me: req.session.me ? req.session.me : null
                        }
                    });
                });
            });
        }
    },
    create: (req, res, next) => {
        check_exist_user();
        if (req.method == 'GET') {
            res.render('backend/users/create', {
                site_info: {
                    page_title: 'Add new user',
                    page_slug: 'create_user',
                    me: req.session.me ? req.session.me : null
                }
            });
        } else if (req.method == 'POST') {
            var form = new formidable.IncomingForm(); form.maxFileSize = 20 * 1024 * 1024;
            form.parse(req, (err, fields, files) => {
                var username = (fields.username && fields.username != null && fields.username != '' && typeof fields.username !== 'undefined' && valid_username(fields.username)) ? fields.username : undefined,
                    email = (fields.email && fields.email != null && fields.email != '' && typeof fields.email !== 'undefined' && valid_email(fields.email)) ? fields.email : undefined,
                    password = (fields.password && fields.password != null && fields.password != '' && typeof fields.password !== 'undefined' && valid_password(fields.password)) ? md5(fields.password) : undefined;
                if (username && email && password) {
                    var arr_data = new Object();
                    arr_data.username = username;
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
                    } else {
                        arr_data.thumbnail = null;
                    };
                    arr_data.key = md5(Math.random().toString());
                    arr_data.verify = '0';
                    arr_data.role = fields.role ? fields.role : '0';
                    arr_data.created_at = new Date();
                    arr_data.updated_at = null;
                    m_users.create(arr_data, (err, result) => {
                        if (result) {
                            req.session.me = result;
                            res.redirect(get_admin_url + '/users');
                            // verify email
                            var url_verify = get_site_url + '/verify/' + result.username + '/' + result.key,
                                mail_options = {
                                    from: 'it.hoangsi@gmail.com', to: email, subject: '[' + get_site_name + '] Please verify your email address.',
                                    html: `
                                Help us secure your account by verifying your email address (` + result.email + `). This lets you access all of our features.<br><br>
                                <a href="` + url_verify + `">` + url_verify + `</a><br><br>
                                You’re receiving this email because you recently created a new `+ get_site_name + ` account or added a new email address. If this wasn’t you, please ignore this email.`
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
        check_exist_user();
        if (req.method == 'GET') {
            var _id = (req.params._id && req.params._id != null && req.params._id != '' && typeof req.params._id !== 'undefined') ? req.params._id : undefined;
            if (_id) {
                m_users.findOne({ _id: _id }, (err, result) => {
                    return res.render('backend/users/update', {
                        data_user: JSON.stringify(result) ? JSON.stringify(result) : null,
                        site_info: {
                            page_title: 'Update user',
                            page_slug: 'update_user',
                            me: req.session.me ? req.session.me : null
                        }
                    });
                });
            }
        } else if (req.method == 'PUT') {
            var form = new formidable.IncomingForm(); form.maxFileSize = 20 * 1024 * 1024;
            form.parse(req, (err, fields, files) => {
                var _id = (fields._id && fields._id != null && fields._id != '' && typeof fields._id !== 'undefined') ? fields._id : undefined,
                    email = (fields.email && fields.email != null && fields.email != '' && typeof fields.email !== 'undefined' && valid_email(fields.email)) ? fields.email : null,
                    password = (fields.password && fields.password != null && fields.password != '' && typeof fields.password !== 'undefined' && valid_password(fields.password)) ? md5(fields.password) : null;
                if (_id) {
                    var arr_data = new Object();
                    arr_data.email = email;
                    arr_data.password = password;
                    arr_data.display_name = fields.display_name ? fields.display_name : null;
                    if (files.thumbnail.name) {
                        var name_file = md5(Math.random().toString());
                        var oldpath = files.thumbnail.path;
                        var type_file = (files.thumbnail.name.split('.'))[1];
                        var newpath = path.resolve('assets/backend/uploads/' + name_file + '.' + type_file);
                        fs.rename(oldpath, newpath, (err) => { });
                        arr_data.thumbnail = name_file + '.' + type_file;
                    } else {
                        arr_data.thumbnail = null;
                    };
                    arr_data.role = fields.role ? fields.role : '0';
                    arr_data.updated_at = new Date();
                    m_users.findOneAndUpdate({ _id: _id }, { $set: arr_data }, { new: true }, (err, result) => {
                        if (result) {
                            res.redirect(get_admin_url + '/users/update/' + result._id)
                        }
                    });
                }
            });
        }
    },
    delete: (req, res) => { // done
        var _id = (req.body._id && req.body._id != null && req.body._id != '' && typeof req.body._id !== 'undefined') ? req.body._id : undefined;
        if (_id) {
            m_users.deleteOne({ _id: id }, (err, result) => {
                res.redirect(get_admin_url + '/users')
            });
        }
    }
    // End CURD
}
module.exports = users_controller;