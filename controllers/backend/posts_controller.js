var configs = require('../../config/configs.js'),
    m_posts = require('../../models/posts_model.js'),
    md5 = configs.md5(),
    fs = configs.fs(),
    path = configs.path(),
    formidable = configs.formidable(),
    app = configs.app(),
    body_parser = configs.body_parser(),
    slugify = configs.slugify(),
    get_site_url = configs.get_site_url(),
    get_admin_url = configs.get_admin_url(),
    get_site_name = configs.get_site_name();

app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));

var posts_controller = {
    // CURD
    posts: (req, res, next) => {  // done
        var key_search = (req.query.search && req.query.search != null && req.query.search != '' && typeof req.query.search !== 'undefined') ? req.query.search : undefined,
            per_page = 20,
            page = (req.params.page && req.params.page != null && req.params.page != '' && typeof req.params.page !== 'undefined') ? req.params.page : 1;
        if (!key_search) { // list all
            m_posts.find({}).skip((per_page * page) - per_page).limit(per_page).exec((err, result) => {
                m_posts.count().exec((err, count) => {
                    return res.render('backend/posts/posts', {
                        data_posts: JSON.stringify(result) ? JSON.stringify(result) : null,
                        current: page,
                        pages: Math.ceil(count / per_page),
                        paginate: (count > per_page) ? true : false,
                        site_info: {
                            page_title: 'All posts',
                            page_slug: 'posts',
                            me: req.session.me ? req.session.me : null
                        }
                    });
                });
            });
        } else { // if search
            var regex = [
                { 'title': new RegExp(key_search + '$', "i") }, // thêm '^' +  : là search bắt đầu bằng từ khóa
                { 'slug': new RegExp(key_search + '$', "i") },
                { 'content': new RegExp(key_search + '$', "i") }
            ];
            m_posts.find({ $or: regex }).skip((per_page * page) - per_page).limit(per_page).exec((err, result) => {
                m_posts.find({ $or: regex }).count().exec((err, count) => {
                    return res.render('backend/posts/posts', {
                        data_posts: JSON.stringify(result) ? JSON.stringify(result) : null,
                        current: page,
                        pages: Math.ceil(count / per_page),
                        key_search: key_search ? key_search : null,
                        count_result: count ? count : null,
                        paginate: count > per_page ? true : false,
                        site_info: {
                            page_title: 'Search results',
                            page_slug: 'posts',
                            me: req.session.me ? req.session.me : null
                        }
                    });
                });
            });
        }
    },
    create: (req, res, next) => { // done
        if (req.method == 'GET') {
            res.render('backend/posts/create', {
                site_info: {
                    page_title: 'Add new post',
                    page_slug: 'create',
                    me: req.session.me
                }
            });
        } else if (req.method == 'POST') {
            var form = new formidable.IncomingForm(); form.maxFileSize = 20 * 1024 * 1024; // 20MB
            form.parse(req, (err, fields, files) => {
                var title = (fields.title && fields.title != null && fields.title != '' && typeof fields.title !== 'undefined') ? fields.title : undefined;
                if (title) {
                    var arr_data = new Object();
                    arr_data.title = fields.title;
                    arr_data.slug = slugify(fields.title, { replacement: '-', remove: /[$*_+~.()'"!\-:@]/g, lower: true }) + '-' + md5(Math.random().toString());
                    arr_data.content = fields.content ? fields.content : null;
                    arr_data.excerpt = fields.excerpt ? fields.excerpt : null;
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
                    arr_data.comments = [];
                    arr_data.terms = [];
                    arr_data.custom_fields = [];
                    arr_data.author_id = fields.author_id ? fields.author_id : '1';
                    arr_data.post_type_id = fields.post_type_id ? fields.post_type_id : '1';
                    arr_data.status = fields.status ? fields.status : '0';
                    arr_data.created_at = new Date();
                    arr_data.updated_at = null;
                    arr_data.num_order = fields.num_order ? fields.num_order : '0';
                    m_posts.create(arr_data, (err, result) => {
                        res.redirect(get_admin_url + '/posts/edit/' + result._id);
                    });
                }
            });
        }
    },

    update: (req, res, next) => { // done
        if (req.method == 'GET') {
            var _id = (req.params._id && req.params._id != null && req.params._id != '' && typeof req.params._id !== 'undefined') ? req.params._id : undefined;
            if (_id) {
                m_posts.findOne({ _id: _id }, (err, result) => {
                    return res.render('backend/posts/edit', {
                        data_post: JSON.stringify(result) ? JSON.stringify(result) : null,
                        site_info: {
                            page_title: 'Update post',
                            page_slug: 'update',
                            me: req.session.me
                        }
                    });
                });
            }
        } else if (req.method == 'PUT') {
            var form = new formidable.IncomingForm(); form.maxFileSize = 20 * 1024 * 1024;
            form.parse(req, (err, fields, files) => {
                var _id = (fields._id && fields._id != null && fields._id != '' && typeof fields._id !== 'undefined') ? fields._id : undefined,
                    title = (fields.title && fields.title != null && fields.title != '' && typeof fields.title !== 'undefined') ? fields.title : undefined;
                if (_id && title) {
                    var arr_data = new Object();
                    arr_data.title = fields.title;
                    arr_data.slug = slugify(fields.title, { replacement: '-', remove: /[$*_+~.()'"!\-:@]/g, lower: true }) + '-' + md5(Math.random().toString());
                    arr_data.content = fields.content ? fields.content : null;
                    arr_data.excerpt = fields.excerpt ? fields.excerpt : null;
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
                    arr_data.comments = [];
                    arr_data.terms = [];
                    arr_data.custom_fields = [];
                    arr_data.author_id = fields.author_id ? fields.author_id : '1';
                    arr_data.post_type_id = fields.post_type_id ? fields.post_type_id : '1';
                    arr_data.status = fields.status ? fields.status : '0';
                    arr_data.updated_at = new Date();
                    arr_data.num_order = fields.num_order ? fields.num_order : '0';
                    m_posts.findOneAndUpdate({ _id: _id }, { $set: arr_data }, { new: true }, (err, result) => {
                        res.redirect(get_admin_url + '/posts/update/' + result._id)
                    });
                }
            });
        }
    },
    delete: (req, res, next) => { // done
        var _id = (req.body._id && req.body._id != null && req.body._id != '' && typeof req.body._id !== 'undefined') ? req.body._id : undefined;
        if (_id) {
            m_posts.deleteOne({ _id: _id }, (err, result) => {
                res.redirect(get_admin_url + '/posts')
            });
        }
    }
    // End CURD
}
module.exports = posts_controller;