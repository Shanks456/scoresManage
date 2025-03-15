// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config(); 

const helmet = require('helmet');

// 安全规则解析方法（放在文件顶部常量区）
const safeParseRules = (rulesStr) => {
  if (Array.isArray(rulesStr)) return rulesStr;
  try {
    return JSON.parse(rulesStr);
  } catch (e) {
    if (typeof rulesStr === "string") {
      return rulesStr.split(",").map(s => s.trim()).filter(Boolean);
    }
    return [];
  }
};


// ▼▼▼ 静态资源中间件 ▼▼▼
const path = require('path');  

// ▼▼▼ 认证中间件 ▼▼▼
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ code: 401, message: '未提供凭证' });

    // 同步验证学生和管理员表
    const [admin, student] = await Promise.all([
      db.query('SELECT id FROM admins WHERE token = ? AND role="admin"', [token]),
      db.query('SELECT id FROM students WHERE token = ?', [token])
    ]);
    

    // 管理员优先机制
    if (admin[0].length > 0) {
      req.userType = 'admin';
      return next();
    }

    // 学生访问控制
    if (student[0].length > 0 && req.path.includes('/api/students')) {
      req.userType = 'student';
      return next();
    }

    return res.status(403).json({ code: 403, message: '访问权限不足' });
  } catch (err) {
    console.error('[权限中间件异常]', err);
    return res.status(500).json({ code: 500, message: '权限服务异常' });
  }
};

const app = express();
const port = process.env.PORT || 3006;
const NodeCache = require('node-cache');
const subjectsCache = new NodeCache({ stdTTL: 3600 });



// ▼▼▼ 全局错误捕获 ▼▼▼
process.on('uncaughtException', (err) => {
  console.error('【致命错误】', {
    timestamp: new Date().toISOString(),
    error: err.stack
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('【未处理的Promise拒绝】', {
    promise,
    reason: reason.stack || reason 
  });
});


// 配置静态资源,必须在路由之前
app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  setHeaders: (res) => {
    res.header('Cache-Control', 'public, max-age=31536000');
  }
}));


// 配置数据库连接池
const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'schools'
});


// █████████████████████████████████████████████
// ▼▼▼ 学号生成方法）▼▼▼
const generateStudentId = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `${year}${timestamp}${random}`.slice(0, 15);
};

// 异步生成唯一学号函数
// generateUniqueStudentId函数内添加调试日志
async function generateUniqueStudentId() {
  const maxAttempts = 5;
  
  for (let i = 0; i < maxAttempts; i++) {
    const studentId = generateStudentId();
    console.log(`[学号生成] 尝试第${i+1}次生成:`, studentId); 
    
    try {
      const [existing] = await db.query(
        `SELECT studentId FROM students 
         WHERE studentId = ? 
         LIMIT 1`,  // 优化查询性能
        [studentId]
      );
      
      console.log(`[学号冲突检查] 结果:`, existing[0] ? '存在' : '可用'); 
      
      if (!existing.length) return studentId;
    } catch (err) {
      console.error('[学号生成异常]', err);
    }
  }
  throw new Error(`无法生成唯一学号`);
}

// █████████████████████████████████████████████

const announcementMiddleware = async (req, res, next) => {
  try {
    // 权限验证
    const token = req.headers.authorization?.split(' ')[1];
    
    // 查询管理员表验证token
    const [admin] = await db.query(
      'SELECT id FROM admins WHERE token = ?',
      [token]
    );
    
    if (!admin) {
      return res.status(403).json({
        success: false,
        errorCode: 'AUTH_002',
        message: '需要管理员权限'
      });
    }

    // 获取最新公告ID
    const [latest] = await db.query(
      `SELECT id FROM announcements 
       ORDER BY create_time DESC 
       LIMIT 1`
    );
    
    if (!latest.length) {
      return res.status(404).json({
        success: false,
        errorCode: 'ANN_404',
        message: '未找到可操作的公告'
      });
    }

    req.announcementId = latest[0].id;
    next();
  } catch (error) {
    console.error('[中间件错误]', error);
    res.status(500).json({
      success: false,
      errorCode: 'MID_500'
    });
  }
};
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).send();
});
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-ID', 'Content-Length', 'X-StudentId'], 
  credentials: true,
  maxAge: 86400
}));



// █████████████████████ 中间件 █████████████████████


// 1. 安全中间件（保持不变）
app.use(helmet());
app.use(helmet.hsts({ 
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));

// 2. CORS配置（保持不变）
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Token', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400
}));

// 3. 添加请求体解析中间件
app.use(express.json()); // 解析 application/json
app.use(express.urlencoded({ extended: true })); 



// 5. 诊断中间件（
app.use((req, res, next) => {
  console.log('[请求体诊断] 中间件顺序验证');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body Buffer:', req.rawBody?.toString('utf8').substring(0, 100)); 
  next();
});




// 4. 预检请求处理
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.status(204).send();
});


// 在路由处理前添加
app.use('/api/student/register', (req, res, next) => {
  const fieldLimits = {
    studentName: 20,
    account: 20,
    password: 100,
    phone: 20,
    studentId: 20
  };

  for (const [field, max] of Object.entries(fieldLimits)) {
    if (req.body[field] && req.body[field].length > max) {
      return res.status(400).json({
        success: false,
        errorCode: 'FIELD_TOO_LONG',
        message: `${field}超过${max}字符限制`
      });
    }
  }
  next();
});


// 4添加请求体解析调试中间件

app.use((req, res, next) => {
  console.log('[请求体诊断]', {
    method: req.method,
    path: req.path,
    contentType: req.headers['content-type'],
    rawBody: req.rawBody?.substring(0, 100) 
  });
  next();
});



// 6. 错误处理
app.use((err, req, res, next) => {
  res.status(500).json({ error: '服务器内部错误' });
});
// 检查数据库连接
(async () => {
  try {
      const connection = await db.getConnection();
      console.log('数据库连接成功');
      connection.release();
  } catch (err) {
      console.error('数据库连接失败:', err);
      process.exit(1); // 如果数据库连接失败，直接退出程序
  }
})();




// 教师注册接口
app.post('/api/teacher/register', async (req, res) => {
  const { teacherName, teacherId, account, password, phone } = req.body;

  if (!teacherName || !teacherId || !account || !password) {
    return res.status(400).json({ success: false, message: '所有必填字段不能为空' });
  }

  // 生成token
  const token = crypto.randomBytes(32).toString('hex');

  try {
    // 插入教师数据
    const [result] = await db.query(
      'INSERT INTO teachers (teacherName, teacherId, account, password, phone, token) VALUES (?, ?, ?, ?, ?, ?)',
      [teacherName, teacherId, account, password, phone, token]
    );

    res.json({ success: true, message: '注册成功' });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ success: false, message: '注册失败，可能是账号已存在' });
  }
});


// 教师登录接口
app.post('/api/teacher/login', async (req, res) => {
  const { account, password } = req.body;
  
  if (!account || !password) {
    return res.status(400).json({ success: false, message: '账号和密码不能为空' });
  }

  try {
    const [results] = await db.query(
      'SELECT * FROM teachers WHERE account = ?',
      [account]
    );

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: '账号或密码错误' });
    }

    const teacher = results[0];

    // 验证密码
    if (teacher.password !== password) {
      return res.status(401).json({ success: false, message: '账号或密码错误' });
    }

    // 生成新的token并更新到数据库
    const token = crypto.randomBytes(32).toString('hex');
    await db.query('UPDATE teachers SET token = ? WHERE id = ?', [token, teacher.id]);

    res.json({
      success: true,
      data: {
        token,
        teacherId: teacher.teacherId,
        account: teacher.account,
        teacherName: teacher.teacherName,
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 学生注册接口
app.post('/api/student/register', async (req, res) => {
 // 新增账号存在性预检查
 const [accountCheck] = await db.query(
  'SELECT COUNT(id) AS count FROM students WHERE account = ?',
  [req.body.account]
);

if (accountCheck[0].count > 0) {
  return res.status(409).json({
    success: false,
    errorCode: 'DUPLICATE_ACCOUNT',
    message: '账号已被注册'
  });
}

   // 添加详细字段校验日志
   console.log('[完整请求体验证]', {
    studentName: req.body.studentName?.length,
    accountType: typeof req.body.account,
    passwordValid: /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/.test(req.body.password),
    phoneValue: req.body.phone
  });
 // 在注册接口开始处添加
console.log('[注册请求] 原始数据:', {
  studentName: req.body.studentName?.length,
  account: req.body.account?.length,
  password: req.body.password?.length,
  phone: req.body.phone?.length
});

  try {
   
  
   console.log('[请求体数据]', req.body);
    
   // 统一参数验证
   const requiredFields = ['studentName', 'account', 'password'];
   const { studentName, account, password, phone } = req.body;

   // 1. 字段存在性检查
   const missingFields = requiredFields.filter(field => {
     const value = req.body[field];
     return value === undefined || value === null;
   });
   
   if (missingFields.length > 0) {
     return res.status(400).json({
       success: false,
       errorCode: 'MISSING_FIELDS',
       message: `缺少必填字段: ${missingFields.join(', ')}`,
       missingFields
     });
   }

   // 2. 字段有效性检查
   const invalidFields = [];
   if (studentName.trim() === '') invalidFields.push('studentName');
   if (account.trim() === '') invalidFields.push('account');
   if (password.trim() === '') invalidFields.push('password');
   
   if (invalidFields.length > 0) {
     return res.status(400).json({
       success: false,
       errorCode: 'INVALID_FIELDS',
       message: `字段值无效: ${invalidFields.join(', ')} 不能为空`
     });
   }

    

const formatErrors = [];

if (!/^[\u4e00-\u9fa5a-zA-Z\s\-']{2,30}$/.test(studentName)) {
  formatErrors.push('姓名需2-30个字符（可包含中英文、空格、连字符和撇号）');
}



if (!/^\d{6,20}$/.test(account)) formatErrors.push('账号需6-20位数字');
if (!/^(?=.*[A-Za-z])(?=.*\d).{8,20}$/.test(password)) formatErrors.push('密码需8-20位字母+数字组合');


if (formatErrors.length > 0) {

  console.log('[格式验证详情]', {
    studentName: studentName,
    account: account,
    nameLength: studentName.length,
    accountValid: /^\d{6,20}$/.test(account),
    passwordValid: /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/.test(password)
  });
  
  console.error('[格式验证失败]', formatErrors);


  return res.status(400).json({
    success: false,
    errorCode: 'FORMAT_ERROR',
    message: '字段格式错误',
    errors: formatErrors,

    debugInfo: {
      nameLength: studentName.length,
      accountLength: account.length,
      passwordLength: password.length
    }
  });
}
    // 数据库操作
    const studentId = await generateUniqueStudentId();
    const token = crypto.randomBytes(32).toString('hex');

  
const [result] = await db.query(
  `INSERT INTO students 
    (studentName, account, password, phone, token, studentId, grade)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [
    studentName.substring(0, 20), 
    account.substring(0, 20),
    password.substring(0, 100),
    phone ? phone.substring(0, 20) : null,
    token?.substring(0, 64) || null,
    studentId.substring(0, 20),
    '2023级'
  ]
);


// 验证1：通过insertId查询
const [byId] = await db.query(
  `SELECT studentId,account FROM students 
   WHERE id = ?`, 
  [result.insertId]
);

// 验证2：通过生成的studentId查询
const [byStudentId] = await db.query(
  `SELECT id FROM students 
   WHERE studentId = ? 
   LIMIT 1`,
  [studentId]  
);

console.log('[插入验证] 按ID查询:', byId[0]);
console.log('[插入验证] 按学号查询:', byStudentId[0]);

if (!byId[0] || !byStudentId[0]) {
  throw new Error('数据持久化验证失败');
}




res.status(200)
  .header('Content-Type', 'application/json; charset=utf-8')
  .header('X-Content-Type-Options', 'nosniff')
  .json({
    success: true,   
    code: 200,        
    message: '注册成功', 
    data: {
      studentId: studentId,
      account: account,
      token: token
    }
  });

console.log('[注册成功数据验证]', {
  insertId: result.insertId,
  generatedStudentId: studentId,
  dbStudentId: byId[0].studentId,    
  clientAccount: account,
  dbAccount: byId[0].account        
});

  } catch (error) {
    console.error('[注册错误详情]', {
      errorCode: error.code,
      sqlMessage: error.sqlMessage,
      requestBody: req.body
    });

    // 处理重复条目错误
    if (error.code === 'ER_DUP_ENTRY') {
      const errorMap = {
        'students.studentId': { code: 409, message: '学号冲突' },
        'students.account': { code: 409, message: '账号已存在' },
        'students.phone': { code: 409, message: '手机号已注册' }
      };
    

      const key = error.sqlMessage.match(/key '(.+?)'/)?.[1] || 'unknown';
  return res.status(errorMap[key]?.code || 409).json({
    success: false,
    errorCode: `DUPLICATE_${key.split('.').pop().toUpperCase()}`,
    message: errorMap[key]?.message || '数据冲突'
  });
    }

    // 处理数据库连接错误
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({  
        success: false,
        errorCode: 'DB_UNAVAILABLE',
        message: '数据库服务不可用'
      });
    }

    // 处理字段验证错误
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: error.message
      });
    }

    // 通用错误处理
    return res.status(500).json({
      success: false,
      errorCode: 'SYSTEM_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : '系统繁忙，请稍后重试'
    });
  }
});




// ======================== 学生管理接口 ========================
// 获取所有学生信息
app.get('/api/getStudents', async (req, res) => {
  try {
    const [result] = await db.query('SELECT * FROM students');
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('获取学生列表失败:', err);
    res.status(500).json({ success: false, message: '数据库错误', error: err.message });
  }
});

// 状态检查接口
app.get('/status', (req, res) => {
  res.json({ success: true, message: '服务器正常运行' });
});

// 获取单个学生信息
app.get('/api/getStudent/:studentId', async (req, res) => {
  const { studentId } = req.params;
  try {
    const [result] = await db.query('SELECT * FROM students WHERE studentId = ?', [studentId]);
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: '学生不存在' });
    }
    res.json({ success: true, data: result[0] });
  } catch (err) {
    console.error('获取学生信息失败:', err);
    res.status(500).json({ success: false, message: '数据库错误', error: err.message });
  }
});


// 登录接口
app.post('/api/student/login', async (req, res) => {
  console.log(`[${new Date().toISOString()}] 接收到登录请求`);
  
  try {
    // 1. 直接获取原始参数
    const { account, password } = req.body;
    console.log('原始请求参数:', { account, password });

    // 2. 基础参数验证
    if (!account || !password) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_PARAMETERS',
        message: '账号和密码不能为空'
      });
    }

    // 3. 类型验证
    if (typeof account !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_TYPE',
        message: '账号和密码必须为字符串'
      });
    }

    // 4. 直接使用原始账号查询（需确保使用参数化查询）
    const [results] = await db.query(
      'SELECT * FROM students WHERE account = ?',
      [account] // 使用原始账号值
    );

    // 5. 用户存在性检查
    if (results.length === 0) {
      console.warn('账号不存在:', account);
      return res.status(401).json({
        success: false,
        errorCode: 'ACCOUNT_NOT_FOUND',
        message: '账号或密码错误'
      });
    }

    const student = results[0];

    // 6. 密码验证
    if (student.password !== password) {
      console.error('密码验证失败');
      return res.status(401).json({
        success: false,
        errorCode: 'PASSWORD_MISMATCH',
        message: '账号或密码错误'
      });
    }

    // 7. 生成并存储Token
    const token = crypto.randomBytes(32).toString('hex');
  
    // 执行UPDATE并验证结果
    const [updateResult] = await db.query(
      'UPDATE students SET token = ? WHERE account = ?',
      [token, account]
    );
  
    if (updateResult.affectedRows === 0) {
      console.error('Token更新失败', { account });
      return res.status(500).json({
        success: false,
        errorCode: 'TOKEN_UPDATE_FAILED',
        message: '登录状态保存失败'
      });
    }
  
    // 构造响应数据
    const responseData = {
      studentId: student.studentId,
      account: student.account,
      studentName: student.studentName,
      grade: student.grade,
      token: token
    };
  
    res.json({
      success: true,
      data: responseData,
      message: '登录成功'
    });
  } catch (err) {
    console.error('服务器错误:', err);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: '服务器内部错误'
    });
  }
});

// 学生信息查询接口
app.get('/api/student/info', async (req, res) => {
  const { account } = req.query;
  
  try {
    const [results] = await db.query(`
      SELECT 
        id,
        studentName,
        studentId,
        account,
        grade
      FROM students 
      WHERE account = ?
    `, [account]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  } catch (err) {
    console.error('数据库查询失败:', err);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 管理员登录接口
// 在登录接口中设置管理员token
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === '123') {
    const token = crypto.randomBytes(32).toString('hex');
    
    // 更新管理员token
    await db.query(
      'UPDATE admins SET token = ? WHERE username = ?',
      [token, username]
    );
    
    res.json({ 
      success: true, 
      data: { token }
    });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

// 教师登录接口
app.post('/api/teacher/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'teacher' && password === '123') {
    res.json({ success: true, role: 'teacher', message: '登录成功' });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});




// 更新学生信息
app.put('/api/updateStudent/:id', async (req, res) => {
  const { id } = req.params;
  const { studentName, studentId, grade } = req.body;
  if (!studentName || !studentId || !grade) {
    return res.status(400).json({ success: false, message: '学生信息不完整' });
  }
  try {
    const [result] = await db.query(
      'UPDATE students SET studentName = ?, studentId = ?, grade = ? WHERE id = ?',
      [studentName, studentId, grade, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '学生不存在' });
    }
    res.json({ success: true, message: '学生信息更新成功' });
  } catch (err) {
    console.error('更新学生信息失败:', err);
    res.status(500).json({ success: false, message: '数据库错误', error: err.message });
  }
});

// 删除学生
app.delete('/api/deleteStudent/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [id]);
    res.json({ success: true, message: '学生删除成功' });
  } catch (err) {
    console.error('删除学生失败:', err);
    res.status(500).json({ success: false, message: '数据库错误', error: err.message });
  }
});
// ======================== 科目管理接口 ========================

// 获取所有科目 

app.get('/api/subjects', async (req, res) => {
  const cachedData = subjectsCache.get('all');
  if (cachedData) return res.json(cachedData);

  try {
 
    const [results] = await db.query(`
      SELECT id, subjectName 
      FROM subjects
      ORDER BY id ASC
    `);

   
    const responseData = results.length > 0 ? {
      success: true,
      data: results
    } : {
      success: false,
      message: '暂无科目数据'
    };

    // 设置缓存
    subjectsCache.set('all', responseData);
    res.json(responseData);
  } catch (err) {
    console.error('数据库错误:', err);
    res.status(500).json({
      success: false,
      errorCode: 'DB_ERROR'
    });
  }
});

// 添加科目
app.post('/api/addSubject', (req, res) => {
  const { subjectName } = req.body;
  if (!subjectName) {
    return res.status(400).json({ success: false, message: '科目名称不能为空' });
  }
  const sql = 'INSERT INTO subjects (subjectName) VALUES (?)';
  db.query(sql, [subjectName], (err, result) => {
    if (err) {
      console.error('添加科目失败:', err);
      return res.status(500).json({ success: false, message: '数据库错误', error: err.message });
    }
    res.json({ success: true, message: '科目添加成功', data: result });
  });
});

// 删除科目
app.delete('/api/deleteSubject/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM subjects WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('删除科目失败:', err);
      return res.status(500).json({ success: false, message: '数据库错误', error: err.message });
    }
    res.json({ success: true, message: '科目删除成功' });
  });
});

// ======================== 成绩管理接口 ========================

// 获取所有成绩

app.get('/api/scores', async (req, res) => {
  console.log('请求参数:', {
    account: req.query.account,
    subjectId: req.query.subjectId
  });

  // Token验证
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: '未授权' });

  // 参数校验
  const { account, subjectId } = req.query;
  if (!account || !subjectId || isNaN(subjectId)) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_PARAMETERS',
      message: '参数格式错误: account必填, subjectId必须为数字'
    });
  }

  try {
    // 查询学生信息
    const [student] = await db.query(
      'SELECT studentId FROM students WHERE account = ?',
      [account]
    );

    if (!student?.[0]) {
      console.warn('学生不存在:', account);
      return res.status(404).json({ 
        success: false,
        errorCode: 'STUDENT_NOT_FOUND'
      });
    }

    // 构建查询语句
    const querySQL = `
      SELECT sc.score, sc.comment, sc.updatedAt, sub.subjectName
      FROM scores sc
      JOIN subjects sub ON sc.subjectId = sub.id
      WHERE sc.studentId = ? AND sc.subjectId = ?
      ORDER BY sc.updatedAt DESC
      LIMIT 1
    `;

    // 执行成绩查询 
    const [results] = await db.query(querySQL, [
      student[0].studentId, 
      parseInt(subjectId)
    ]);

    console.log('查询结果:', results);

    // 处理空数据
    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
        meta: {
          studentId: student[0].studentId,
          subjectId: parseInt(subjectId),
          timestamp: new Date().toISOString()
        }
      });
    }

    
    const formattedData = {
      ...results[0],
      updatedAt: new Date(results[0].updatedAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    return res.json({
      success: true,
      data: formattedData,
      meta: {
        studentId: student[0].studentId,
        subjectId: parseInt(subjectId),
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[SCORES_ERROR]', {
      timestamp: new Date().toISOString(),
      queryParams: req.query,
      error: {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }
    });
    res.status(500).json({
      success: false,
      errorCode: 'DB_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : '数据库查询失败'
    });
  }
});


// 根据学生的账号和科目ID获取成绩的接口

app.post('/api/addScore', (req, res) => {
  const { studentId, subjectId, score, comment } = req.body;
  // 类型强制验证
  if (typeof studentId !== 'string' || isNaN(subjectId)) {
    return res.status(400).json({ 
      success: false, 
      message: '参数类型错误：studentId 必须为字符串，subjectId 必须为数字' 
    });
  }
  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ success: false, message: '数据库连接失败' });
    connection.beginTransaction(async (tranErr) => {
      if (tranErr) {
        connection.release();
        return res.status(500).json({ success: false, message: '事务启动失败' });
      }
      try {
        
        const [validation] = await connection.promise().query(
          `SELECT 
            EXISTS(SELECT 1 FROM students WHERE studentId = ?) AS studentExists,
            EXISTS(SELECT 1 FROM subjects WHERE id = ?) AS subjectExists`,
          [studentId, subjectId]
        );
        const { studentExists, subjectExists } = validation[0];
        if (!studentExists || !subjectExists) {
          await connection.rollback();
          const msg = !studentExists ? '学生不存在' : '科目不存在';
          return res.status(404).json({ success: false, message: msg });
        }
       
        const [result] = await connection.promise().query(
          `INSERT INTO scores (studentId, subjectId, score, comment)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             score = VALUES(score),
             comment = VALUES(comment)`,
          [studentId, subjectId, score, comment]
        );
        await connection.commit();
        res.json({
          success: true,
          message: result.affectedRows > 1 ? '成绩更新成功' : '成绩录入成功',
          data: result
        });
      } catch (error) {
        await connection.rollback();
        
       
if (error.code === 'ER_DUP_ENTRY') {
  const errorDetails = {
    'account': { code: 409, message: '账号已被注册' },
    'phone': { code: 409, message: '手机号已存在' }
  };
  
  const matchedKey = Object.keys(errorDetails).find(key => 
    error.sqlMessage.includes(`key '${key}'`) 
  );
  
  if (matchedKey) {
    return res.status(409).json({
      success: false,
      errorCode: 'DUPLICATE_ACCOUNT', 
      message: errorDetails[matchedKey].message
    });
  }
}
        console.error('数据库操作失败:', error);
        res.status(500).json({ 
          success: false, 
          message: '数据库操作失败',
          error: error.message 
        });
      } finally {
        connection.release();
      }
    });
  });
});



// 删除成绩
app.delete('/api/deleteScore/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM scores WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('删除成绩失败:', err);
      return res.status(500).json({ success: false, message: '数据库错误', error: err.message });
    }
    res.json({ success: true, message: '成绩删除成功' });
  });
});
app.get('/api/db-check', async (req, res) => {
  try {
    const [result] = await db.query('SELECT 1+1 AS solution');
    res.json({ success: true, solution: result[0].solution });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get('/api/validate/fetchData', (req, res) => {
  const { studentId, subjectId } = req.query;
  
  const sql = `
  SELECT 
    (SELECT COUNT(*) FROM students WHERE studentId = ?) AS studentExists,
    (SELECT COUNT(*) FROM subjects WHERE id = ?) AS subjectExists
`;


  db.query(sql, [studentId, subjectId], (err, result) => {
    if (err) {
      console.error('验证失败:', err);
      return res.status(500).json({ success: false, message: '数据库错误' });
    }

    const { studentExists, subjectExists } = result[0];
    res.json({ success: true, studentExists: !!studentExists, subjectExists: !!subjectExists });
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.get('/api/current-student', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: '未授权' });

  try {
    
    const [students] = await db.query(`
      SELECT 
        studentId,
        account,
        studentName,
        grade,
        createdAt,
        updatedAt
      FROM students 
      WHERE token = ?
    `, [token]);

   
    if (students.length > 1) {
      console.error('Token重复异常', { token });
      return res.status(500).json({
        success: false,
        errorCode: 'DUPLICATE_TOKEN',
        message: '系统异常，请联系管理员'
      });
    }

    if (students.length === 0) {
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_EXPIRED',
        message: '登录已过期，请重新登录'
      });
    }

  
    const responseData = {
      ...students[0],
      lastAccess: new Date().toISOString()
    };

    res.json({ success: true, data: responseData });

  }  catch (err) {
    console.error('数据库错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/network-diag', (req, res) => {
  const diagnostics = {
    serverTime: new Date().toISOString(),
    clientIP: req.ip,
    headers: req.headers,
    dnsLookup: req.hostname
  };
  res.json(diagnostics);
});


// ======================== 创建公告接口 ========================
app.post('/api/announcements', async (req, res) => {
  // 权限验证
  const token = req.headers.authorization?.split(' ')[1];
  if (token !== 'admin_token') {
    return res.status(403).json({ 
      success: false, 
      errorCode: 'AUTH_002',
      message: '需要管理员权限' 
    });
  }

  try {
    const { greeting, body, rules = [], ending = '', signature } = req.body;


    const validations = [
      { field: greeting, name: '问候语' },
      { field: body, name: '正文内容' },
      { field: signature, name: '签名' }
    ];
    
    for (const { field, name } of validations) {
      if (!field?.trim()) {
        return res.status(400).json({
          success: false,
          errorCode: 'ANN_002',
          message: `${name}不能为空`,
          invalidField: name
        });
      }
    }

    
    const announcementData = {
      title: greeting.substring(0, 100), 
      greeting: greeting.substring(0, 100),
      body: body.substring(0, 2000),
      rules: JSON.stringify(Array.isArray(rules) ? rules : []),
      ending: ending.substring(0, 500),
      signature: signature.substring(0, 50),
      publisher: '管理员'
    };

   
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.query(
        `INSERT INTO announcements SET ?`,
        announcementData
      );

      await connection.commit();

      // 清除相关缓存
      announcementCache.del('announcements_all');
      announcementCache.del('latest_announcement');

      res.json({
        success: true,
        data: {
          id: result.insertId,
          ...announcementData,
          rules: JSON.parse(announcementData.rules),
          create_time: new Date().toISOString()
        }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[公告发布错误]', {
      time: new Date().toISOString(),
      error: err.message,
      stack: err.stack
    });
    
    res.status(500).json({
      success: false,
      errorCode: 'ANN_003',
      message: process.env.NODE_ENV === 'production' 
        ? '公告发布失败' 
        : err.message
    });
  }
});


//缓存机制

const announcementCache = new NodeCache({
  stdTTL: 300, 
  checkperiod: 60
});

// 字段长度验证中间件
const validateAnnouncement = (req, res, next) => {
  const fieldLimits = {
    title: { max: 100 },
    signature: { max: 50 },
    ending: { max: 500 }
  };

  for (const [field, limit] of Object.entries(fieldLimits)) {
    if (req.body[field] && req.body[field].length > limit.max) {
      return res.status(400).json({
        success: false,
        errorCode: 'FIELD_TOO_LONG',
        message: `${field}超过${limit.max}字符限制`
      });
    }
  }
  next();
};

// ▼▼▼ 在中间件区域校验函数 ▼▼▼
const validateJSON = (field) => {
  return (req, res, next) => {
    if (!req.body[field]) {
      return res.status(400).json({ 
        success: false, 
        errorCode: 'MISSING_FIELD',
        message: `${field}字段不能为空`
      });
    }

    try {
      JSON.parse(req.body[field]);
      next();
    } catch (e) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_JSON',
        message: `${field}必须是有效的JSON字符串`
      });
    }
  };
};
// 公告获取接口

app.put('/api/announcements/:id', 
  authMiddleware,
  async (req, res) => {
     
      console.log('[管理员操作]', {
        adminId: req.adminId,
        operation: '修改公告',
        timestamp: new Date().toISOString()
      });
  
    if (!Array.isArray(req.body.rules)) {
      return res.status(400).json({/*...*/});
    }
    try {
      const announcementId = req.params.id;

     
if (!Array.isArray(rules)) {
  return res.status(400).json({
    success: false,
    errorCode: 'ANN_004',
    message: '规则必须为数组格式'
  });
}
      const { greeting, body, rules, ending, signature } = req.body;
      const validations = [
        { field: greeting, name: '问候语', max: 100 },
        { field: body, name: '正文内容', max: 2000 },
        { field: signature, name: '签名', max: 50 }
      ];

      // 验证字段长度
      for (const { field, name, max } of validations) {
        if (field && field.length > max) {
          return res.status(400).json({
            success: false,
            errorCode: 'FIELD_TOO_LONG',
            message: `${name}超过${max}字符限制`
          });
        }
      }

    
      const [result] = await db.query(
        `UPDATE announcements SET
          greeting = ?,
          body = ?,
          rules = ?,
          ending = ?,
          signature = ?,
          update_time = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          greeting?.substring(0, 100) || '',
          body?.substring(0, 2000) || '',
          JSON.stringify(rules || []),
          ending?.substring(0, 500) || null,
          signature?.substring(0, 50) || '',
          announcementId
        ]
      );

    
      const [updated] = await db.query(
        `SELECT * FROM announcements WHERE id = ?`,
        [announcementId]
      );

      res.json({
        success: true,
        data: {
          ...updated[0],
          rules: JSON.parse(updated[0].rules)
        }
      });
    } catch (error) {
      console.error('[公告更新失败]', error);
      res.status(500).json({
        success: false,
        errorCode: 'ANN_500',
        message: '公告更新失败'
      });
    }
  }
);


const safeJsonParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('JSON解析失败，使用默认值:', str);
    return [];
  }
};


// ======================== 公告接口 ========================
app.get('/api/announcements', async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT 
        id,
        greeting,
        body,
        rules,
        ending,
        signature
      FROM announcements 
      ORDER BY create_time DESC 
      LIMIT 1
    `);

    if (!result.length) {
      return res.status(200).json({ 
        success: true,
        data: null,
        message: '暂无公告'
      });
    }

    
    const announcement = {
      ...result[0],
      rules: safeParseRules(result[0].rules)
    };

    res.status(200).json({
      success: true,
      data: announcement
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      errorCode: 'DB_ERROR'
    });
  }
});
//​健康检查接口
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ 
      success: true,
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      database: 'disconnected',
      error: error.message
    });
  }
});



// ======================== 404 处理 ========================
app.use((req, res) => {
  res.status(404).json({ success: false, message: '请求的资源未找到' });
});

// ======================== 全局错误处理 ========================
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err); 
  }
  
  console.error(`[全局错误] ${err.stack}`);
  res.status(500).json({
    success: false,
    errorCode: 'SYSTEM_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? '系统服务暂时不可用' 
      : err.message
  });
});

// ======================== 启动服务器 ========================
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});