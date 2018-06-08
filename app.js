/* https://hoangsi.com/ */
var config = require('./config/config.js');
var app = config.app();
var express = config.express();
var session = config.session();
var body_parser = config.body_parser();
var path = config.path();
var fs = config.fs();

const server = require('http').Server(app);
const method_override = require('method-override')
global.io = require('socket.io')(server);  // golobal để sử dụng trên tất cả file
// phải dùng cái này mới dùng được Post
server.listen(process.env.PORT || 3000, () => { console.log('Server runing with port 3000 !!!!'); });
/* --------------------------------------------------------------------------------------- */
app.use(body_parser.json()); // support json encoded bodies
app.use(body_parser.urlencoded({ extended: true })); // support encoded bodies
app.use(method_override('_method'));
app.use(express.static('./assets')); // thư mục public chứa hình, css,...
app.set('view engine', 'ejs'); // đặt template engine là EJS
app.set('views', './views'); // trỏ vào thư mục view để chứa các file template
app.use((req, res, next) => {
    session({
        secret: 'hoangsi', saveUninitialized: true, resave: true, maxAge: req.body.remember ? (24 * 60 * 60 * 1000 * 30) : null//, maxAge: 24 * 60 * 60 * 1000 * 30 // 30 ngày
    })(req, res, next);
});

/* --------------------------------------------------------------------------------------- */
var backend_controller = require('./controllers/backend/backend_controller.js');
var articles_controller = require('./controllers/backend/articles_controller.js');
var users_controller = require('./controllers/backend/users_controller.js');
var frontend_controller = require('./controllers/frontend/frontend_controller.js');
/* --------------------------------------------------------------------------------------- */


// RESTful API
app.route('/api/articles')
    .get(articles_controller.api_articles)
    .post(articles_controller.api_insert)
app.route('/api/articles/:id')
    .get(articles_controller.api_edit)
    .put(articles_controller.api_update)
    .delete(articles_controller.api_delete)
// End RESTful API

// BACKEND

function auth(req, res, next) {
    if (!req.session.me) {
        res.redirect('/signin');
    } else {
        next();
    }
}

// articles
app.route('/backend/dashboard')
    .get(auth, backend_controller.dashboard)

app.route('/backend/articles')
    .get(auth, articles_controller.articles)

app.route('/backend/articles/page/:page')
    .get(auth, articles_controller.articles)

app.route('/backend/articles/create')
    .get(auth, articles_controller.create)
    .post(auth, articles_controller.insert)

app.route('/backend/articles/edit/:id')
    .get(auth, articles_controller.edit)

app.route('/backend/articles/update')
    .put(auth, articles_controller.update)

app.route('/backend/articles/delete')
    .delete(auth, articles_controller.delete)
// end articles

// users
app.route('/signin')
    .get(users_controller.signin)
    .post(users_controller.signin)
app.route('/signup')
    .get(users_controller.signup)
    .post(users_controller.signup)
app.route('/verify/:username/:key')
    .get(users_controller.verify)
app.route('/signout')
    .get(users_controller.signout)
app.route('/password_reset')
    .get(users_controller.password_reset)
    .post(users_controller.password_reset)
    .put(users_controller.password_reset)
/* */
app.route('/backend/users')
    .get(auth, users_controller.users)

app.route('/backend/users/page/:page')
    .get(auth, users_controller.users)

app.route('/backend/users/create')
    .get(auth, users_controller.create)
    .post(auth, users_controller.create)

app.route('/backend/users/edit/:id')
    .get(auth, users_controller.update)

app.route('/backend/users/update')
    .put(auth, users_controller.update)

app.route('/backend/users/delete')
    .delete(auth, users_controller.delete)
// end users

// End BACKEND

// FRONTEND
app.route('/')
    .get(frontend_controller.index)


// End FRONTEND
/* --------------------------------------------------------------------------------------- */