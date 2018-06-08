var mongoose = require('../../config/database.js');

var articles_schema = new mongoose.Schema({
    title: String,
    slug: String,
    content: String,
    excerpt: String,
    thumbnail: String,
    created_at: String,
    updated_at: String
});
module.exports = mongoose.model('articles', articles_schema);  // articles là tên collecttion