var express = require('express');
var session = require('cookie-session');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var md5 = require('md5');
var body_parser = require('body-parser');
var slugify = require('slugify');


var config = {
    app: () => {
        var app = express();
        app.set('port', 3000);
        return app;
    },
    express: () => {
        return express;
    },
    session: () => {
        return session;
    },
    get_admin_url: () => {
        return 'http://127.0.0.1:3000/backend';
    },
    get_base_url: () => {
        return 'http://127.0.0.1:3000';
    },
    blog_name: () => {
        return 'HoangSi';
    },
    fs: () => {
        return fs;
    },
    formidable: () => {
        return formidable;
    },
    path: () => {
        return path;
    },
    md5: () => {
        return md5;
    },
    body_parser: () => {
        return body_parser;
    },
    slugify: () => {
        return slugify;
    }
}

module.exports = config;