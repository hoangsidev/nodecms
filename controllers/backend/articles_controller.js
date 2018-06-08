var m_articles = require('../../models/backend/articles_model.js');
var config = require('../../config/config.js');
var md5 = config.md5();
var fs = config.fs();
var path = config.path();
var formidable = config.formidable();
var app = config.app();
var body_parser = config.body_parser();
var slugify = config.slugify();
var get_base_url = config.get_base_url();
var get_admin_url = config.get_admin_url();

app.use(body_parser.json()); // support json encoded bodies
app.use(body_parser.urlencoded({ extended: true })); // support encoded bodies

var articles_controller = {

    // RESTful API
    api_articles: (req, res) => {
        m_articles.find({}, (err, result) => {
            return res.json(result);
        });
    },
    api_insert: (req, res) => {
        var arr_data = new Object();
        arr_data.title = req.body.title ? req.body.title : null;
        arr_data.content = req.body.content ? req.body.content : null;
        arr_data.tags = req.body.tags ? req.body.tags : null;
        arr_data.created_at = new Date();
        m_articles.create(arr_data, (err, result) => {
            return res.json(result);
        });
    },
    api_edit: (req, res) => {
        var id = req.params.id;
        m_articles.find({ _id: id }, (err, result) => {
            return res.json(result);
        });
    },
    api_update: (req, res) => {
        var id = req.body.id;
        var arr_data = new Object();
        arr_data.title = req.body.title ? req.body.title : null;
        arr_data.content = req.body.content ? req.body.content : null;
        arr_data.tags = req.body.tags ? req.body.tags : null;
        arr_data.updated_at = new Date();
        m_articles.updateOne({ _id: id }, { $set: { arr_data } }, (err, result) => {
            return res.json(result);
        });
    },
    api_delete: (req, res) => {
        var id = req.body.id;
        m_articles.deleteOne({ _id: id }, (err, result) => {
            return res.json(result);
        });
    },
    // end RESTful API

    // CURD

    articles: (req, res, next) => { // list all & search
        var key_search = req.query.search ? req.query.search : null;
        var per_page = 5;
        var page = req.params.page || 1;
        var page_slug = 'articles'; // khai báo slug để sử dụng lại pagination nhiều lần

        if (!key_search) {
            var page_title = 'All articles';
            m_articles.find({})
                .skip((per_page * page) - per_page)
                .limit(per_page)
                .exec(function (err, result) {
                    m_articles.count().exec(function (err, count) {
                        return res.render('backend/articles/articles', {
                            data_articles: JSON.stringify(result) ? JSON.stringify(result) : null,
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
            m_articles.find({
                $or: [
                    { 'title': new RegExp('^' + key_search + '$', "i") },
                    { 'slug': new RegExp('^' + key_search + '$', "i") },
                    { 'content': new RegExp('^' + key_search + '$', "i") },
                    { 'tags': new RegExp('^' + key_search + '$', "i") }
                ]
            })
                .skip((per_page * page) - per_page)
                .limit(per_page)
                .exec(function (err, result) {
                    m_articles.find({
                        $or: [
                            { 'title': new RegExp('^' + key_search + '$', "i") },
                            { 'slug': new RegExp('^' + key_search + '$', "i") },
                            { 'content': new RegExp('^' + key_search + '$', "i") },
                            { 'tags': new RegExp('^' + key_search + '$', "i") }
                        ]
                    }).count().exec(function (err, count) {
                        return res.render('backend/articles/articles', {
                            data_articles: JSON.stringify(result) ? JSON.stringify(result) : null,
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
        var page_slug = 'create';
        var page_title = 'Add new article';
        res.render('backend/articles/create', {
            page_slug: page_slug,
            page_title: page_title
        });
    },
    insert: (req, res) => {
        var form = new formidable.IncomingForm();
        // form.maxFileSize = 200 * 1024 * 1024;
        form.parse(req, (err, fields, files) => {
            var arr_data = new Object();
            arr_data.title = fields.title ? fields.title : null;
            arr_data.slug = slugify(fields.title, { replacement: '-', remove: /[$*_+~.()'"!\-:@]/g, lower: true }) + '-' + md5(Math.random().toString());
            arr_data.content = fields.content ? fields.content : null;
            arr_data.excerpt = fields.excerpt ? fields.excerpt : null;
            if (files.thumbnail) {
                var name_file = md5(Math.random().toString());
                var oldpath = files.thumbnail.path;
                var type_file = (files.thumbnail.name.split('.'))[1];
                var newpath = path.resolve('assets/backend/uploads/' + name_file + '.' + type_file);
                fs.rename(oldpath, newpath, (err) => { });
                arr_data.thumbnail = name_file + '.' + type_file;
            }
            arr_data.created_at = new Date();
            m_articles.create(arr_data, (err, result) => {
                res.redirect(get_admin_url + '/articles/edit/' + result._id)
            });
        });
    },
    edit: (req, res) => {
        var page_slug = 'edit';
        var page_title = 'Edit article';
        var id = req.params.id;
        m_articles.findOne({ _id: id }, (err, result) => {
            return res.render('backend/articles/edit', {
                data_article: JSON.stringify(result) ? JSON.stringify(result) : null,
                page_slug: page_slug,
                page_title: page_title
            });
        });
    },
    update: (req, res) => {
        var page_slug = 'update';
        var page_title = 'Update article';
        var form = new formidable.IncomingForm();
        // form.maxFileSize = 200 * 1024 * 1024;
        form.parse(req, (err, fields, files) => {
            var id = fields.id;
            if(id) {
                var arr_data = new Object();
                arr_data.title = fields.title ? fields.title : null;
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
                }
                arr_data.updated_at = new Date();
                m_articles.findOneAndUpdate({ _id: id }, { $set: arr_data }, { new: true }, (err, result) => {
                    res.redirect(get_admin_url + '/articles/edit/' + result._id)
                });
            }
            
        });
    },
    delete: (req, res) => {
        var page_slug = 'delete';
        var page_title = 'Delete article';
        var id = req.body.id;
        m_articles.deleteOne({ _id: id }, (err, result) => {
            res.redirect(get_admin_url + '/articles')
        });
    }
    // End CURD
}
module.exports = articles_controller;