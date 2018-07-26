//Helper function
const pp = x => JSON.stringify(x, null, 2);

// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  comments: {},
  nextCommentId: 1
};


const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  '/comments': {
    'POST': createComment,
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  }
};

function createComment(url, request) {
  const response = {};
  const comment = request.body && request.body.comment;
  const body = comment && comment.body;
  const username = comment && comment.username;
  const articleNum = comment && comment.articleId;
  let commentId = database.nextCommentId++
  if (comment && body && database.users[username] && database.articles[articleNum]) {
    const newComment = {
      id: commentId,
      body: body,
      username: username,
      articleId: articleNum,
      upvotedBy: [],
      downvotedBy: []
      };
    
    database.users[username].commentIds.push(commentId);
    database.articles[articleNum].commentIds.push(commentId);
    database.comments[newComment.id] = newComment;
    response.body = {comment: newComment};
    response.status = 201; 
  }
  else {
    response.status = 400;
  }

  return response;
};

function updateComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedComment = database.comments[id];
  const requestComment = request.body && request.body.comment;
  const commentBody = requestComment && requestComment.body;
  const response = {};
  if (!requestComment  || !commentBody) {
    response.status = 400;
    //not supplied a request body
    //no comment was supplied to update the existing comment
  }
  else if (!savedComment) {
    response.status = 404;
    //no comment exists in database
  }
  else {
    savedComment.body = requestComment.body || savedComment.body;
    //take the body of the database comment and assign the new comment's body, but if is not truthy, will assign itself back
    response.status = 200;
  }

  return response;
};

function deleteComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  let savedComment = database.comments[id];
  const response = {};

  if (savedComment) {
    database.comments[id] = null;
    const article = database.articles[savedComment.articleId];
    const artComIds = article && article.commentIds;
    if (artComIds) {
        artComIds.splice(artComIds.indexOf(id), 1);
      }
    const userComments = database.users[savedComment.username]
    const userComIds = userComments && userComments.commentIds;
    if (userComIds) {
      userComIds.splice(userComIds.indexOf(id), 1);
      response.status = 204;
    }
  }
  else {
    response.status = 404;
  }

  return response;
};


function upvoteComment(url, request) {

  console.log(`>>>>>>>> request.body is: ${pp(request.body)}`);
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const body = request.body;
  const username = body && body.username;
  const comment = database.comments[id];
  const response = {};

  if (username !== database.users[username]) {
    response.status = 400;
  }
  else if (!comment) {
    response.status = 400;
  }
  else if (!body) {
    response.status = 400;
  }
  else if (!username) {
    response.status = 400;
  }
  else if (comment && database.users[username]) {
    const upvotedComment = upvote(comment, database.users[username]);
    response.body = upvotedComment.body;
    response.status = 200;
  }
  return response;
};

function downvoteComment(url, request) {

  console.log(`>>>>>>>> request.body is: ${pp(request.body)}`);
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const body = request.body;
  const username = body && body.username;
  const comment = database.comments[id];
  const response = {};

  if (username !== database.users[username]) {
    response.status = 400;
  }
  else if (!comment) {
    response.status = 400;
  }
  else if (!body) {
    response.status = 400;
  }
  else if (!username) {
    response.status = 400;
  }
  else if (database.users[username] && comment) {
    const downvotedComment = downvote(comment, database.users[username]);
    response.body = downvotedComment.body;
    response.status = 200;
  }
  return response;
};


//Begin provided code

function getUser(url, request) {
  const username = url.split('/').filter(segment => segment)[1];
  const user = database.users[username];
  const response = {};

  if (user) {
    const userArticles = user.articleIds.map(
        articleId => database.articles[articleId]);
    const userComments = user.commentIds.map(
        commentId => database.comments[commentId]);
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = {user: database.users[username]};
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = {user: user};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
        .map(articleId => database.articles[articleId])
        .filter(article => article)
        .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = {article: article};
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
      requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = {article: article};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = {article: savedArticle};
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}

// Write all code above this line.

const http = require('http');
const url = require('url');

const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;

const requestHandler = (request, response) => {
  const url = request.url;
  const method = request.method;
  const route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader(
      'Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    const methodResponse = routes[route][method].call(null, url);
    !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString());
      const jsonRequest = {body: body};
      const methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
}

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});