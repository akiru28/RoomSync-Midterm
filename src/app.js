const express = require('express');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { notFound, globalError } = require('./middleware/errorMiddleware');
const {
  pageAuthenticate,
  pageRequireAuth,
  pageRequireAdmin,
  pageRequireCanReserve,
  pageRequireRole,
} = require('./middleware/authMiddleware');
const { ROLES } = require('./constants/roles');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'RoomSync');
  next();
});

const assetsDir = path.resolve(__dirname, '../public/assets');
const cssDir = path.resolve(__dirname, '../public/css');
const jsDir = path.resolve(__dirname, '../public/js');
const pagesDir = path.resolve(__dirname, '../public/pages');
const componentsDir = path.resolve(__dirname, '../public/components');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'roomsync', time: new Date().toISOString() });
});

app.use('/assets', express.static(assetsDir));
app.use('/css', express.static(cssDir));
app.use('/js', express.static(jsDir));
app.use('/components', express.static(componentsDir));

app.use(pageAuthenticate);

const sendPage = (file) => (req, res) => res.sendFile(path.join(pagesDir, file));

app.get('/', sendPage('index.html'));
app.get('/index.html', sendPage('index.html'));
app.get('/home.html', sendPage('home.html'));
app.get('/login.html', (req, res) => {
  if (req.user) return res.redirect('/dashboard.html');
  return sendPage('login.html')(req, res);
});
app.get('/login', (req, res) => res.redirect('/login.html'));
app.get('/register', (req, res) => {
  if (req.user) return res.redirect('/dashboard.html');
  return res.redirect('/home.html');
});

app.get('/dashboard.html', pageRequireAuth(), sendPage('dashboard.html'));
app.get('/rooms.html', pageRequireAuth(), sendPage('rooms.html'));
app.get('/labs.html', pageRequireAuth(), sendPage('labs.html'));
app.get('/calendar.html', pageRequireAuth(), pageRequireRole(ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.LAB_TECH, ROLES.ADMIN), sendPage('calendar.html'));
app.get('/profile.html', pageRequireAuth(), sendPage('profile.html'));
app.get('/my-reservations.html', pageRequireAuth(), pageRequireRole(ROLES.INSTRUCTOR, ROLES.ADMIN), sendPage('my-reservations.html'));
app.get('/reports.html', pageRequireAuth(), pageRequireRole(ROLES.LAB_TECH, ROLES.ADMIN), sendPage('reports.html'));

app.get('/reservation.html', pageRequireAuth(), pageRequireCanReserve(), sendPage('reservation.html'));

app.get('/admin.html', pageRequireAuth(), pageRequireAdmin(), sendPage('admin.html'));

app.use((req, res, next) => {
  if (!req.user) return next();
  if (req.path.endsWith('.html') || req.path.endsWith('.htm')) {
    if (/^\/admin/i.test(req.path)) {
      return res.redirect('/dashboard.html');
    }
    if (req.path.includes('reservation') && req.user.role !== ROLES.INSTRUCTOR && req.user.role !== ROLES.ADMIN) {
      return res.redirect('/dashboard.html');
    }
  }
  return next();
});

app.use(express.static(pagesDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') && !filePath.includes('index.html') && !filePath.includes('login.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  },
}));

app.use(notFound);
app.use(globalError);

module.exports = app;
